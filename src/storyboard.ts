import { nanoid } from "nanoid";
import { StoryboardSession, TimelineFrame } from "./storyboard-session";
import { Result } from "@soapjs/soap-cli-common";

const findLastIndex = (arr: any[], callback) => {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (callback(arr[i], i)) {
      return i;
    }
  }
  return -1;
};

const findLast = (arr: any[], callback) => {
  const index = findLastIndex(arr, callback);
  return index !== -1 ? arr[index] : undefined;
};

export enum FrameType {
  EmptyFrame = "empty_frame",
  KeyFrame = "key_frame",
  ActionFrame = "action_frame",
  StoryFrame = "story_frame",
  StopFrame = "stop_frame",
  LoopFrame = "loop_frame",
  JumpFrame = "jump_frame",
}

export type ConditionFunction = (
  timeline?: ContextTimeline,
  ...args: unknown[]
) => boolean;

export abstract class Frame<ResultType = any, ContextType = any> {
  constructor(public readonly name: string) {}
  abstract run(context?: ContextType): ResultType | Promise<ResultType>;
}

export type FrameFunction<T = any> = (timeline: ContextTimeline) => Promise<T>;

export type InternalFrame<T = any> = {
  action?: Frame<T>;
  readonly frameType: FrameType;
  frameRunCondition?: ConditionFunction;
  frameContextProvider?: ContextProvider<T>;
  loopContextProvider?: LoopContextProvider<T>;
  frameIndex?: number;
  [key: string]: unknown;
};

export type ContextProvider<ContextType, ParentContextType = any> = (
  timeline: ContextTimeline,
  parentContext?: ParentContextType
) => ContextType;
// TODO: loopFrame
export type LoopContextProvider<
  ContextType,
  ListType = any[],
  ParentContextType = any,
> = (
  list: ListType,
  timeline: ContextTimeline,
  parentContext?: ParentContextType
) => ContextType;

export class ContextTimeline {
  constructor(
    protected timeline: TimelineFrame[],
    protected currentFrame: number
  ) {}
  getFrame(frame: string | number): TimelineFrame {
    return isNaN(+frame)
      ? findLast(this.timeline, (f) => f.name === frame)
      : findLast(this.timeline, (f) => f.frameIndex === frame);
  }

  get prevFrame(): TimelineFrame {
    const frame = this.timeline[this.currentFrame - 1];
    if (frame) {
      const i = findLastIndex(
        this.timeline,
        (item) => item.name === frame.name
      );
      return this.timeline[i];
    }

    return {
      index: this.currentFrame - 1,
      name: "",
      type: FrameType.EmptyFrame,
      output: {},
      completed: true,
    };
  }
}

export class StoryFrameAction {
  constructor(
    protected storyboard: Storyboard<any>,
    public readonly name: string
  ) {}

  public run(context: { [key: string]: any }) {
    return this.storyboard.run(context);
  }
}

export abstract class StoryResolver<Outcome> {
  abstract resolve(timeline: TimelineFrame[], ...args: unknown[]): Outcome;
}

export class Storyboard<OutcomeType> {
  protected frames: InternalFrame[] = [];
  protected relatedSessions: StoryboardSession[] = [];
  public readonly id = nanoid();

  constructor(
    protected name: string,
    protected session: StoryboardSession,
    protected resolver: StoryResolver<OutcomeType>
  ) {}

  public addFrame<ResultType = any, FrameContextType = any>(
    frame: Frame<ResultType, FrameContextType>,
    contextProvider?: ContextProvider<FrameContextType>,
    condition?: ConditionFunction
  ) {
    this.frames.push({
      action: frame,
      frameType: FrameType.KeyFrame,
      frameIndex: this.frames.length,
      frameContextProvider: contextProvider,
      frameRunCondition: condition,
    });

    return this;
  }

  public addStopFrame(condition: ConditionFunction, name?: string) {
    this.frames.push({
      action: {
        name: name || `stop_at_${this.frames.length}`,
        run(context) {
          return condition(context);
        },
      } as Frame<any, any>,
      frameType: FrameType.StopFrame,
      frameIndex: this.frames.length,
    });
    return this;
  }
  // TODO: loopFrame
  public addLoopFrame<ResultType = any, FrameContextType = any>(
    frame: Frame<ResultType, FrameContextType>,
    contextProvider?: LoopContextProvider<FrameContextType>,
    condition?: ConditionFunction
  ) {
    this.frames.push({
      action: frame,
      frameType: FrameType.LoopFrame,
      frameIndex: this.frames.length,
      loopContextProvider: contextProvider,
      frameRunCondition: condition,
    });
    return this;
  }

  public gotoFrame(frame: string | number, condition?: ConditionFunction) {
    this.frames.push({
      action: {
        name: `jump_at_${this.frames.length}`,
        run: () => {
          const index = isNaN(+frame)
            ? findLastIndex(this.frames, (item) => item.action.name === frame)
            : frame;

          return index;
        },
      },
      frameType: FrameType.JumpFrame,
      frameIndex: this.frames.length,
      frameRunCondition: condition,
    });

    return this;
  }

  public addStoryFrame<ResultType = any, FrameContextType = any>(
    storyboard: Storyboard<ResultType>,
    condition?: ConditionFunction,
    contextProvider?: ContextProvider<FrameContextType>
  ) {
    this.relatedSessions.push(storyboard.session);
    this.frames.push({
      action: new StoryFrameAction(storyboard, storyboard.name),
      frameType: FrameType.StoryFrame,
      frameIndex: this.frames.length,
      frameRunCondition: condition,
      frameContextProvider: contextProvider,
    });
    return this;
  }

  public async run(
    context: {
      [key: string]: unknown;
    } = {}
  ): Promise<Result<OutcomeType>> {
    const { session, frames, resolver } = this;
    await session.load();

    const lastFrameIndex = frames.length - 1;
    let i = session.timeline.lastFrame
      ? session.timeline.lastFrame.completed
        ? session.timeline.lastFrame.index + 1
        : session.timeline.lastFrame.index
      : 0;

    do {
      const frame = frames[i];
      const timeline = new ContextTimeline(session.timeline.list(), i);
      const valid = frame.frameRunCondition
        ? frame.frameRunCondition(timeline)
        : true;

      if (valid) {
        let ctx;

        if (frame.frameContextProvider) {
          ctx = frame.frameContextProvider(timeline, context);
        } else if (context) {
          ctx = context;
        }

        if (frame.frameType === FrameType.JumpFrame) {
          session.timeline.add(
            frame.action.name,
            frame.frameType,
            frame.frameIndex,
            i,
            true
          );

          const jumpIndex = frame.action.run();
          if (jumpIndex > i) {
            for (++i; i < jumpIndex; i++) {
              const empty = frames[i];
              session.timeline.add(
                empty.action.name,
                FrameType.EmptyFrame,
                i,
                {},
                true
              );
            }
          } else {
            i = jumpIndex;
          }
          session.save();
          continue;
        } else if (frame.frameType === FrameType.StoryFrame) {
          const story = session.timeline.add(
            frame.action.name,
            frame.frameType,
            frame.frameIndex,
            {},
            false
          );
          session.save();
          story.output = await frame.action.run(ctx);
          story.completed = true;
          session.timeline.update(story);
          session.save();
          break;
        } else if (frame.frameType === FrameType.StopFrame) {
          const shouldBreak = await frame.action.run(timeline);
          session.timeline.add(
            frame.action.name,
            frame.frameType,
            frame.frameIndex,
            shouldBreak,
            true
          );
          session.save();
          if (shouldBreak) {
            break;
          }
        } else {
          const frameOutput = await frame.action.run(ctx);
          session.timeline.add(
            frame.action.name,
            frame.frameType,
            frame.frameIndex,
            frameOutput,
            true
          );
          session.save();
        }
      } else {
        session.timeline.add(
          frame.action.name,
          FrameType.EmptyFrame,
          frame.frameIndex,
          {},
          true
        );
        session.save();
      }
      i++;
    } while (i <= lastFrameIndex);

    try {
      const outcome: any = resolver
        ? resolver.resolve(session.timeline.list())
        : session.timeline.list();
      session.clear();
      this.relatedSessions.forEach((session) => session.clear());
      return Result.withContent(outcome);
    } catch (error) {
      return Result.withFailure(error);
    }
  }
}
