const fetch = require("node-fetch");

class BugcidePlugin {
  constructor(options) {
    console.log(options);
    this.options = options;
    this.isErrorSendReady = false;
    this.serverUrl = 'http://localhost:8080';
    console.log(this.serverUrl);
  }
  apply(compiler) {
    console.log('applying', this.options);
    compiler.hooks.emit.tapPromise('BugcidePlugin', async (compilation) => {
      console.log('The webpack build process is starting!!!');

      if (!compilation.errors.length) {
        return;
      }

      this.isErrorSendReady = true;
      const errorCollection = compilation.errors.map(err => {
        const messageStart = err.error.message.indexOf(' ');
        const messageEnd = err.error.message.indexOf('\n');
        return {
          name: err.error.name,
          message: err.error.message.slice(messageStart, messageEnd),
          stack: err.error.toString(),
          filename: err.origin.issuer.resource,
          lineno: err.error.loc.line,
          colno: err.error.loc.column,
          duplicate_count: 1,
          created_at: new Date()
        };
      });

      const errorList = {
        errorInfo: errorCollection
      };

      console.log('catch errors====================');
      // console.dir(compilation.errors[0]);
      if (!this.isErrorSendReady) {
        return callback();
      }

      try {
        const response = await this.sendErrorApi(this.options.projectToken, errorList);
        console.log(response);

        if (response.result === 'unauthorized') {
          throw new Error('Project Token is invalid!');
        }

        if (response.result !== 'ok' && response.result !== 'not changed') {
          throw new Error('Something went wrong.');
        }
      } catch (err) {
        console.log('Bugcide: ' + err.message);
      }

      this.isErrorSendReady = false;
      console.log(compilation.errors[0].error.toString());
      console.log(errorList);
      console.log('catch errors====',compilation.warnings);
    });
  }
  sendErrorApi(projectToken, errorList) {
    return fetch(`${this.serverUrl}/project/${projectToken}/error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorList)
    })
      .then(res => res.json());
  }
}

module.exports = BugcidePlugin;
