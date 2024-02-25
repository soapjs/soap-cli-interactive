# SoapJS CLI Interactive Tools

## Overview

The `@soapjs/soap-cli-interactive` package enables the creation of interactive console forms to facilitate the construction of project components without the need for deep JSON syntax knowledge. Users can build JSON content by answering questions and describing specific fields, which is then processed to generate project code files. This package includes session management to allow users to continue incomplete sessions, such as after an accidental terminal closure.

## Features

- **Interactive Forms**: Split into frames, these forms guide users through a scenario, collecting necessary information step-by-step.
- **Storyboard Management**: Manages the sequence and conditions under which each frame is executed, and what data is passed between them.
- **Session Continuation**: Enables users to resume interrupted form filling, ensuring progress is not lost unexpectedly.
- **JSON File Generation**: Saves each frame's data into a JSON file, typically located in the `.soap/sessions` directory, forming the basis for project code generation.

## Usage

This package is used by `@soapjs/soap-cli` and is not intended to be installed directly in a project. It is designed to be a standalone utility due to its specific functionalities, which can be leveraged in other contexts as well. 

## Example

Provide a simple example of how a storyboard might be defined and used, along with how interaction prompts can be integrated into the user's workflow.

```typescript
export class NewControllerResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    const result = {
      models: [],
      entities: [],
      controllers: [],
      routes: [],
    };

    for (const frame of timeline) {
      if (frame.name === DefineControllerHandlersFrame.NAME) {
        result.models.push(...frame.output.models);
        result.entities.push(...frame.output.entities);
      } else if (frame.name === CreateRoutesForHandlersFrame.NAME) {
        result.routes.push(...frame.output.routes);
        result.models.push(...frame.output.models);
        result.entities.push(...frame.output.entities);
      } else if (frame.name === CreateControllerFrame.NAME) {
        result.controllers.push(...frame.output.controllers);
        result.models.push(...frame.output.models);
        result.entities.push(...frame.output.entities);
      }
    }

    return result;
  }
}

export class NewControllerStoryboard extends Storyboard<ApiJson> {
  constructor(texts: Texts, config: Config, session?: StoryboardSession) {
    super(
      "new_controller_storyboard",
      session || new StoryboardSession("new_controller_storyboard"),
      new NewControllerResolver()
    );

    this.addFrame(new DefineControllerNameAndEndpointFrame(config, texts))
      .addFrame(new DefineControllerHandlersFrame(config, texts), (t) => {
        const { name, endpoint } = t.getFrame(0).output;
        return { name, endpoint };
      })
      .addFrame(
        new CreateRoutesForHandlersFrame(config, texts),
        (t) => {
          const { name, endpoint } = t.getFrame(0).output;
          const { handlers, models, entities } = t.getFrame(1).output;

          return {
            name,
            endpoint,
            handlers,
            models,
            entities,
          };
        },
        (t) => {
          const { handlers } = t.getFrame(1).output;
          return handlers.length > 0;
        }
      )
      .addFrame(new CreateControllerFrame(config, texts), (t) => {
        const { name, endpoint } = t.getFrame(0).output;
        const { handlers, models, entities } = t.getFrame(1).output;

        return {
          name,
          endpoint,
          handlers,
          entities,
          models,
        };
      });
  }
}
```

## Contribution

Contributions to the `@soap-cli-interactive` package are welcome. Whether it's improving the existing code, adding new features, or fixing bugs, your input helps enhance the `soap` ecosystem. Please follow the contributing guidelines outlined in the repository.

## Documentation

For detailed documentation and additional usage examples, visit [SoapJS documentation](https://docs.soapjs.com).

## Issues
If you encounter any issues, please feel free to report them [here](https://github.com/soapjs/soap/issues/new/choose).

## Contact
For any questions, collaboration interests, or support needs, you can contact us through the following:

- Official:
  - Email: [contact@soapjs.com](mailto:contact@soapjs.com)
  - Website: https://soapjs.com
- Radoslaw Kamysz:
  - Email: [radoslaw.kamysz@gmail.com](mailto:radoslaw.kamysz@gmail.com)
  - Warpcast: [@k4mr4ad](https://warpcast.com/k4mr4ad)
  - Twitter: [@radoslawkamysz](https://x.com/radoslawkamysz)

## License

@soapjs/soap-cli-interactive is [MIT licensed](./LICENSE).