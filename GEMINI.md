# Project Overview

This project is a Node.js-based data compression service used by the [Bandwidth Hero](https://github.com/ayastreb/bandwidth-hero) browser extension. Its primary function is to intercept image requests, download the original image, and then compress it on-the-fly to a low-resolution WebP or JPEG format. This process helps to significantly reduce data usage for the end-user. The service can also convert images to greyscale for additional data savings.

The core of the application is an Express server that handles image processing using the `sharp` library. It's designed to be deployed as a microservice, for example on Vercel.

**Key Technologies:**
- **Node.js:** The runtime environment.
- **Express:** A minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.
- **sharp:** High performance Node.js image processing, the fastest module to resize JPEG, PNG, WebP and TIFF images.
- **request:** Simplified HTTP request client.

It is important to note that this service is **not** an anonymizing proxy. It passes the user's cookies and IP address to the origin server when fetching the original image.

# Building and Running

## Prerequisites

- [Node.js](https://nodejs.org/) (version 14.x is specified in `package.json`)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/ayastreb/bandwidth-hero-proxy.git
    cd bandwidth-hero-proxy
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

## Running the Server

To start the server locally, run the following command:

```bash
npm start
```

The server will start on port 8080 by default, or on the port specified by the `PORT` environment variable.

## Deployment

The project includes a `vercel.json` file and instructions in the `README.md` for deploying to [Vercel](https://vercel.com/).

# Development Conventions

- The main application logic is written in JavaScript (ES6+), following a modular approach with different functionalities separated into files within the `src/` directory.
- The server entry point is `server.js`, which sets up the Express app and routes.
- The core functionality is divided into modules for authentication (`authenticate.js`), parameter handling (`params.js`), and the main proxying and compression logic (`proxy.js`).
- The project uses `basic-auth` for simple authentication.
- Asynchronous operations are handled using `async/await`.
- The code is well-commented and follows a consistent style.
