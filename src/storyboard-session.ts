import path from "path";
import { nanoid } from "nanoid";
import { paramCase } from "change-case";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { InteractionPrompts } from "./interaction-prompts";
import { Result, Texts } from "@soapjs/soap-cli-common";

const removeNullUndefined = <T = any>(obj: T, deep = false): T => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === null || obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
};

export type TimelineFrame = {
  index: number;
  name: string;
  type: string;
  output: any;
  completed: boolean;
};
export type TimelineFrameEdit = {
  index?: number;
  name?: string;
  type?: string;
  output?: any;
  completed?: boolean;
};

export type StoryboardSessionModel = {
  storyboard: string;
  timeline: TimelineFrame[];
};

export class SessionTimeline {
  constructor(protected data: TimelineFrame[]) {}

  public get lastFrame(): TimelineFrame {
    return this.data[this.data.length - 1];
  }

  public add(
    frameName: string,
    frameType: string,
    frameIndex: number,
    frameOutput: any,
    completed: boolean
  ) {
    const item = {
      index: this.data.length,
      name: frameName,
      type: frameType,
      output: frameOutput,
      frameIndex,
      completed,
    };
    this.data.push(item);

    return { ...item };
  }

  public update(item: TimelineFrameEdit) {
    const safeItem = removeNullUndefined(item);
    Object.assign(this.data[item.index], safeItem);
  }

  public list(start?: number, end?: number): TimelineFrame[] {
    return this.data.slice(start, end);
  }
}

export class StoryboardSession {
  public readonly id = nanoid();
  protected sessionPath: string;
  protected model: StoryboardSessionModel;
  protected sessionTimeline: SessionTimeline;

  constructor(
    public readonly name: string,
    public readonly sessionsPath: string,
    public readonly parentSession?: string
  ) {
    this.sessionPath = this.generatePath(name, parentSession);
  }

  protected generatePath(name: string, parentSession?: string): string {
    return path.join(
      this.sessionsPath,
      `${paramCase(parentSession ? parentSession + " " + name : name)}.json`
    );
  }

  public get timeline(): SessionTimeline {
    return this.sessionTimeline;
  }

  public async load() {
    try {
      const { name: storyboard, sessionPath, parentSession } = this;
      const texts = await Texts.load();
      if (existsSync(this.sessionsPath) === false) {
        mkdirSync(this.sessionsPath, { recursive: true });
      }
      if (existsSync(sessionPath)) {
        this.model = JSON.parse(readFileSync(sessionPath, "utf-8"));
        if (
          !!parentSession ||
          (await InteractionPrompts.confirm(
            texts
              .get("continue_prev_session_#")
              .replace("#", this.model.storyboard)
          ))
        ) {
          this.sessionTimeline = new SessionTimeline(this.model.timeline);
          return;
        }
      }
      this.model = { storyboard, timeline: [] };
      this.sessionTimeline = new SessionTimeline(this.model.timeline);
    } catch (error) {
      console.log(error);
    }
  }

  public save(): Result {
    try {
      const { model, sessionPath } = this;
      writeFileSync(sessionPath, JSON.stringify(model, null, 2), "utf-8");
      return Result.withoutContent();
    } catch (error) {
      return Result.withFailure(error);
    }
  }

  public async clear(): Promise<Result> {
    try {
      if (existsSync(this.sessionPath)) {
        unlinkSync(this.sessionPath);
      }
      this.model = null;
      this.sessionTimeline = null;
      return Result.withoutContent();
    } catch (error) {
      return Result.withFailure(error);
    }
  }
}
