export abstract class Interaction<T = any> {
  public abstract run(...args: unknown[]): Promise<T>;
}
