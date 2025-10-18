// @ts-expect-error - I'd love types on this
import PrettyTable from "prettytable";
import { getChar } from "./util.js";

type Config<
  Data extends Record<Col, string>[],
  Col extends keyof Data[number],
> = {
  filtering?: {
    doesRowMatch: (row: Data[number], search: string) => boolean;
  };
  hotkeys?: Record<number, () => Promise<boolean | void>>;
};

const DEFAULT_CONFIG = {};

export class DataTable<
  Data extends Record<Col, string>[],
  Col extends keyof Data[number],
> {
  readonly #config: Config<Data, Col>;
  readonly #columns: Col[];
  #data: Data;
  #search: string;

  #isRunning = false;
  #wasRawWhenStarted = false;

  constructor(
    data: Data,
    columns: Col[],
    config: Config<Data, Col> = {},
    search = "",
  ) {
    this.#data = data;
    this.#columns = columns;
    this.#search = search;

    this.#config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  updateData(data: Data): void {
    this.#data = data;
    if (this.#isRunning) {
      this.#redraw();
    }
  }

  async run(): Promise<void> {
    this.#isRunning = true;
    this.#wasRawWhenStarted = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    while (this.#isRunning) {
      this.#redraw();
      const input = getChar();

      if (input === 3) {
        // Ctrl-C
        this.#stop();
        continue;
      }
      if (input === 127) {
        // Backspace
        this.#search = this.#search.substring(0, this.#search.length - 1);
        continue;
      }

      const hotkeyHandler = this.#config.hotkeys?.[input];
      if (hotkeyHandler) {
        process.stdout.cursorTo(0, process.stdout.rows - 2);
        const shouldQuit = await hotkeyHandler();
        if (shouldQuit) {
          this.#stop();
        }
        continue;
      }

      // Normal character, I hope
      this.#search += String.fromCharCode(input);
    }
  }

  #stop(): void {
    if (!this.#isRunning) {
      return;
    }

    this.#isRunning = false;
    process.stdout.cursorTo(0, process.stdout.rows);
    if (!this.#wasRawWhenStarted) {
      process.stdin.setRawMode(false);
    }
    console.log();
  }

  #redraw(): void {
    const searchPrompt = `Search: ${this.#search}`;

    const o = process.stdout;
    o.cursorTo(0, 0);
    console.clear();
    o.write(`${searchPrompt}\n`);
    this.#printTable();
    o.cursorTo(searchPrompt.length, 0);
  }

  #printTable(): void {
    let rows: Record<Col, string>[] = this.#data;

    if (this.#config.filtering) {
      rows = rows.filter((row) =>
        this.#config.filtering!.doesRowMatch(row, this.#search),
      );
    }

    const stringRows = rows
      .map((row) => {
        return this.#columns.map((col) => row[col]);
      })
      .slice(0, process.stdout.rows - 7);

    const pt = new PrettyTable();
    pt.create(this.#columns, stringRows);
    pt.print();
  }
}
