/** Token OAuth revogado, expirado ou database inacessível → bot pede reconexão. */
export class NotionConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotionConnectionError';
  }
}

export class NotionWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotionWriteError';
  }
}

export class NotionQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotionQueryError';
  }
}
