// utils/ExpressError.js (or wherever you prefer to store it)

class ExpressError extends Error {
    constructor(statusCode, message) {
        super(); // Call the parent Error constructor
        this.statusCode = statusCode;
        this.message = message;
    }
}

module.exports = ExpressError; // Export it for use in other files