const fetch = require("node-fetch");

class BugcidePlugin {
  constructor(options) {
    this.options = options;
    this.isErrorSendReady = false;
    this.serverUrl = 'http://localhost:8080';
  }
  apply(compiler) {
    console.log('Bugcide webpack plugin start');
    compiler.hooks.emit.tapAsync('BugcidePlugin', async (compilation, callback) => {

      if (!compilation.errors.length) {
        return callback();
      }

      this.isErrorSendReady = true;
      const errorCollection = compilation.errors.map(err => {

        let filename, lineno, colno;
        let targetError;

        if (err.name === 'ModuleError') {
          targetError = err.module.error ? err.module.error.error : err;

          filename = err.module.issuer.resource;
        } else {
          targetError = err.error.stack ? err.error : err;

          filename = err.origin.issuer.resource;
        }

        lineno = targetError.loc && targetError.loc.line;
        colno = targetError.loc && targetError.loc.col;
        return {
          name: targetError.name,
          message: targetError.message.split('\n')[0],
          stack: targetError.stack,
          lineno,
          colno,
          filename,
          duplicate_count: 1,
          created_at: new Date()
        };
      });

      const errorList = { errorInfo: errorCollection };

      if (!this.isErrorSendReady) {
        return callback();
      }

      try {
        this.isErrorSendReady = false;
        const response = await this.sendErrorApi(this.options.projectToken, errorList);

        if (response.result === 'unauthorized') {
          throw new Error('Project Token is invalid!');
        }

        if (response.result !== 'ok' && response.result !== 'not changed') {
          throw new Error('Something went wrong.');
        }
      } catch (err) {
        console.log('Bugcide Error: ' + err.message);
      }

      callback();
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
