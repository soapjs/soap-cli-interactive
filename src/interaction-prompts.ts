const {
  Confirm,
  Input,
  Form,
  Snippet,
  Select,
  MultiSelect,
} = require("enquirer");

export class InteractionPrompts {
  public static continue(message: string, header?: string) {
    return new Promise((resolve, reject) => {
      const prompt = new Confirm({
        name: "question",
        message: `${message} Do you want to continue?`,
        header,
      });

      prompt
        .run()
        .then((answer) => resolve(answer.toString() === "true"))
        .catch(reject);
    });
  }

  public static confirm(message: string, header?: string) {
    return new Promise<boolean>((resolve, reject) => {
      const prompt = new Confirm({
        name: "question",
        message,
        header,
      });

      prompt
        .run()
        .then((value) => {
          const answer: string = value.toString().toLowerCase();
          return resolve(
            answer === "y" ||
              answer === "true" ||
              answer === "yes" ||
              answer === "tak" ||
              answer === "1"
          );
        })
        .catch(reject);
    });
  }

  public static input<T = string>(
    message: string,
    initial?: string,
    hint?: string,
    header?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const prompt = new Input({
        header,
        message,
        initial,
        hint,
      });

      prompt
        .run()
        .then((answer) => resolve(answer))
        .catch(reject);
    });
  }

  public static select<T = any>(
    message: string,
    choices: any[],
    initial?: any,
    hint?: string,
    header?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const prompt = new Select({
        name: "select",
        message,
        choices,
        initial,
        hint,
        header,
      });

      prompt
        .run()
        .then((answer) => resolve(answer))
        .catch(reject);
    });
  }

  public static multiSelect<T>(
    message: string,
    choices: any[],
    initial?: any[],
    hint?: string,
    header?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const prompt = new MultiSelect({
        message,
        choices,
        hint,
        initial,
        header,
      });

      prompt
        .run()
        .then((answer) => resolve(answer))
        .catch(reject);
    });
  }

  public static form<T>(
    message: string,
    form: { name: string; message: string; initial?: unknown; hint?: string }[],
    header?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const prompt = new Form({
        name: "form",
        message,
        choices: form,
        header,
      });

      prompt
        .run()
        .then((answer) => resolve(answer))
        .catch(reject);
    });
  }

  public static snippet(
    message: string,
    template: {
      fields: {
        name: string;
        message?: string;
        initial?: string;
        required?: boolean;
      }[];
      required: boolean;
      template: string;
    },
    header?: string
  ) {
    return new Promise((resolve, reject) => {
      const prompt = new Snippet({
        name: "snippet",
        message,
        required: template.required,
        fields: template.fields,
        template: template.template,
        header,
      });

      prompt
        .run()
        .then((answer) => resolve(answer))
        .catch(reject);
    });
  }
}
