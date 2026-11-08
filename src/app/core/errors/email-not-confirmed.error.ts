export class EmailNotConfirmedError extends Error {
  constructor() {
    super('Email not confirmed');
    this.name = 'EmailNotConfirmedError';
  }
}
