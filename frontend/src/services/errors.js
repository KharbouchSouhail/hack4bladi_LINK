// Errors the service layer throws, mirroring the HTTP errors a real backend would return.

export class AccessError extends Error {
  // requiredPlan is set when an upgrade would grant access (HTTP 402); otherwise it's a 403.
  constructor(message, requiredPlan = null) {
    super(message);
    this.name = "AccessError";
    this.requiredPlan = requiredPlan;
  }
}

export class NotFoundError extends Error {
  constructor(what = "This item") {
    super(`${what} could not be found.`);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(fieldErrors, message = "Please fix the highlighted fields.") {
    super(message);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}
