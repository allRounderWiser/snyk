import * as _ from 'lodash';
import {test} from 'tap';

const port = process.env.PORT || process.env.SNYK_PORT || '12345';

const apiKey = '123456789';
const notAuthorizedApiKey = 'notAuthorized';
let oldkey;
let oldendpoint;
process.env.SNYK_API = 'http://localhost:' + port + '/api/v1';
process.env.SNYK_HOST = 'http://localhost:' + port;
process.env.LOG_LEVEL = '0';

// tslint:disable-next-line:no-var-requires
const server = require('../cli-server')(
  process.env.SNYK_API, apiKey, notAuthorizedApiKey,
);

// ensure this is required *after* the demo server, since this will
// configure our fake configuration too
import * as cli from '../../src/cli/commands';

const before = test;
const after = test;

before('setup', async (t) => {
  let key = await cli.config('get', 'api');
  oldkey = key; // just in case
  t.pass('existing user config captured');

  key = await cli.config('get', 'endpoint');
  oldendpoint = key; // just in case
  t.pass('existing user endpoint captured');

  await server.listen(port);
  t.pass('started demo server');
});

before('prime config', async (t) => {
  try {
    await cli.config('set', 'api=' + apiKey);
    t.pass('api token set');
    await cli.config('unset', 'endpoint');
    t.pass('endpoint removed');
  } catch (e) {
    t.bailout();
    t.end();
  }
});

test('cli tests for online repos', async (t) => {
  try {
    const res = await cli.test('semver@2');
    t.fail(res);
  } catch (error) {
    const res = error.message;
    const pos = res.toLowerCase().indexOf('vulnerability found');
    t.pass(res);
    t.notEqual(pos, -1, 'correctly found vulnerability: ' + res);
  }

  try {
    const res = await cli.test('semver@2', {json: true});
    t.fail(res);
  } catch (error) {
    const res = JSON.parse(error.message);
    const vuln = res.vulnerabilities[0];
    t.pass(vuln.title);
    t.equal(vuln.id, 'npm:semver:20150403',
      'correctly found vulnerability: ' + vuln.id);
  }
});

test('multiple test arguments', async (t) => {
  try {
    const res = await cli.test('semver@4', 'qs@6');
    const lastLine = res.trim().split('\n').pop();
    t.equals(lastLine, 'Tested 2 projects, no vulnerable paths were found.',
      'successfully tested semver@4, qs@6');
  } catch (error) {
    t.fail(error);
  }

  try {
    const res = await cli.test('semver@4', 'qs@1');
    t.fail(res);
  } catch (error) {
    const res = error.message;
    const lastLine = res.trim().split('\n').pop();
    t.equals(lastLine, 'Tested 2 projects, 1 contained vulnerable paths.',
      'successfully tested semver@4, qs@1');
  }

  try {
    const res = await cli.test('semver@2', 'qs@6');
    t.fail(res);
  } catch (error) {
    const res = error.message;
    const lastLine = res.trim().split('\n').pop();
    t.equals(lastLine, 'Tested 2 projects, 1 contained vulnerable paths.',
      'successfully tested semver@2, qs@6');
  }

  try {
    const res = await cli.test('semver@2', 'qs@1');
    t.fail(res);
  } catch (error) {
    const res = error.message;
    const lastLine = res.trim().split('\n').pop();
    t.equals(lastLine, 'Tested 2 projects, 2 contained vulnerable paths.',
      'successfully tested semver@2, qs@1');
  }
});

test('test for existing remote package with dev-deps only with --dev', async (t) => {
  try {
    const res = await cli.test('lodash@4.17.11', {dev: true});
    const lastLine = res.trim().split('\n').pop();
    t.deepEqual(lastLine, '✓ Tested lodash@4.17.11 for known vulnerabilities, no vulnerable paths found.',
      'successfully tested lodash@4.17.11');
  } catch (error) {
    t.fail('should not throw, instead received error: ' + error);
  }
});

test('test for existing remote package with dev-deps only', async (t) => {
  try {
    const res = await cli.test('lodash@4.17.11');
    const lastLine = res.trim().split('\n').pop();
    t.deepEqual(lastLine, 'Tip: Snyk only tests production dependencies by default ' +
    '(which this project had none). Try re-running with the `--dev` flag.',
    'tip text as expected');
  } catch (error) {
    t.fail('should not throw, instead received error: ' + error);
  }
});

test('test for non-existing', async (t) => {
  try {
    const res = await cli.test('@123');
    t.fails('should fail, instead received ' + res);
  } catch (error) {
    const res = error.message;
    const lastLine = res.trim().split('\n').pop();
    t.deepEqual(lastLine, 'Failed to get vulns', 'expected error: Failed to get vulns');
  }
});

after('teardown', async (t) => {
  delete process.env.SNYK_API;
  delete process.env.SNYK_HOST;
  delete process.env.SNYK_PORT;
  t.notOk(process.env.SNYK_PORT, 'fake env values cleared');

  await server.close();
  t.pass('server shutdown');
  let key = 'set';
  let value = 'api=' + oldkey;
  if (!oldkey) {
    key = 'unset';
    value = 'api';
  }
  await cli.config(key, value);
  t.pass('user config restored');
  if (oldendpoint) {
    cli.config('endpoint', oldendpoint).then(() => {
      t.pass('user endpoint restored');
      t.end();
    });
  } else {
    t.pass('no endpoint');
    t.end();
  }
});