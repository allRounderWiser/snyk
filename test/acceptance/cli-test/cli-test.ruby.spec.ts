import * as path from 'path';
import * as _ from 'lodash';
import { AcceptanceTests } from './cli-test.acceptance.test';

export const RubyTests: AcceptanceTests = {
  language: 'Ruby',
  tests: {
    '`test ruby-app-no-lockfile --file=Gemfile`': (params, utils) => async (
      t,
    ) => {
      utils.chdirWorkspaces();
      try {
        await params.cli.test('ruby-app-no-lockfile', { file: 'Gemfile' });
        t.fail('should have failed');
      } catch (err) {
        t.pass('throws err');
        t.match(err.message, 'Please run `bundle install`', 'shows err');
      }
    },

    '`test ruby-app --file=Gemfile.lock`': (params, utils) => async (t) => {
      utils.chdirWorkspaces();
      await params.cli.test('ruby-app', { file: 'Gemfile.lock' });

      const req = params.server.popRequest();
      t.equal(req.method, 'POST', 'makes POST request');
      t.equal(
        req.headers['x-snyk-cli-version'],
        params.versionNumber,
        'sends version number',
      );
      t.match(req.url, '/test-dep-graph', 'posts to correct url');

      const depGraph = req.body.depGraph;
      t.equal(depGraph.pkgManager.name, 'rubygems');
      t.same(
        depGraph.pkgs.map((p) => p.id).sort(),
        ['ruby-app@', 'json@2.0.2', 'lynx@0.4.0'].sort(),
        'depGraph looks fine',
      );
    },

    '`test ruby-app` meta when no vulns': (params, utils) => async (t) => {
      utils.chdirWorkspaces();
      const res = await params.cli.test('ruby-app');

      const meta = res.slice(res.indexOf('Organization:')).split('\n');
      t.match(meta[0], /Organization:\s+test-org/, 'organization displayed');
      t.match(
        meta[1],
        /Package manager:\s+rubygems/,
        'package manager displayed',
      );
      t.match(meta[2], /Target file:\s+Gemfile/, 'target file displayed');
      t.match(meta[3], /Project name:\s+ruby-app/, 'project name displayed');
      t.match(meta[4], /Open source:\s+no/, 'open source displayed');
      t.match(meta[5], /Project path:\s+ruby-app/, 'path displayed');
      t.notMatch(
        meta[5],
        /Local Snyk policy:\s+found/,
        'local policy not displayed',
      );
    },

    '`test ruby-app-thresholds`': (params, utils) => async (t) => {
      utils.chdirWorkspaces();

      params.server.setNextResponse(
        require('../workspaces/ruby-app-thresholds/test-graph-result.json'),
      );

      try {
        await params.cli.test('ruby-app-thresholds');
        t.fail('should have thrown');
      } catch (err) {
        const res = err.message;

        t.match(
          res,
          'Tested 7 dependencies for known vulnerabilities, found 6 vulnerabilities, 7 vulnerable paths',
          '6 vulns',
        );

        const meta = res.slice(res.indexOf('Organization:')).split('\n');
        t.match(meta[0], /Organization:\s+test-org/, 'organization displayed');
        t.match(
          meta[1],
          /Package manager:\s+rubygems/,
          'package manager displayed',
        );
        t.match(meta[2], /Target file:\s+Gemfile/, 'target file displayed');
        t.match(
          meta[3],
          /Project name:\s+ruby-app-thresholds/,
          'project name displayed',
        );
        t.match(meta[4], /Open source:\s+no/, 'open source displayed');
        t.match(
          meta[5],
          /Project path:\s+ruby-app-thresholds/,
          'path displayed',
        );
        t.notMatch(
          meta[5],
          /Local Snyk policy:\s+found/,
          'local policy not displayed',
        );
      }
    },

    '`test ruby-app-thresholds --severity-threshold=low --json`': (
      params,
      utils,
    ) => async (t) => {
      utils.chdirWorkspaces();

      params.server.setNextResponse(
        require('../workspaces/ruby-app-thresholds/test-graph-result-low-severity.json'),
      );

      try {
        await params.cli.test('ruby-app-thresholds', {
          severityThreshold: 'low',
          json: true,
        });
        t.fail('should have thrown');
      } catch (err) {
        const req = params.server.popRequest();
        t.is(req.query.severityThreshold, 'low');

        const res = JSON.parse(err.message);

        const expected = require('../workspaces/ruby-app-thresholds/legacy-res-json-low-severity.json');

        t.deepEqual(
          _.omit(res, ['vulnerabilities']),
          _.omit(expected, ['vulnerabilities']),
          'metadata is ok',
        );
        t.deepEqual(
          _.sortBy(res.vulnerabilities, 'id'),
          _.sortBy(expected.vulnerabilities, 'id'),
          'vulns are the same',
        );
      }
    },

    '`test ruby-app-thresholds --severity-threshold=medium`': (
      params,
      utils,
    ) => async (t) => {
      utils.chdirWorkspaces();

      params.server.setNextResponse(
        require('../workspaces/ruby-app-thresholds/test-graph-result-medium-severity.json'),
      );

      try {
        await params.cli.test('ruby-app-thresholds', {
          severityThreshold: 'medium',
        });
        t.fail('should have thrown');
      } catch (err) {
        const req = params.server.popRequest();
        t.is(req.query.severityThreshold, 'medium');

        const res = err.message;

        t.match(
          res,
          'Tested 7 dependencies for known vulnerabilities, found 5 vulnerabilities, 6 vulnerable paths',
          '5 vulns',
        );
      }
    },

    '`test ruby-app-thresholds --ignore-policy`': (params, utils) => async (
      t,
    ) => {
      utils.chdirWorkspaces();

      params.server.setNextResponse(
        require('../workspaces/ruby-app-thresholds/test-graph-result-medium-severity.json'),
      );

      try {
        await params.cli.test('ruby-app-thresholds', {
          'ignore-policy': true,
        });
        t.fail('should have thrown');
      } catch (err) {
        const req = params.server.popRequest();
        t.equal(req.query.ignorePolicy, 'true');
        t.end();
      }
    },

    '`test ruby-app-thresholds --severity-threshold=medium --json`': (
      params,
      utils,
    ) => async (t) => {
      utils.chdirWorkspaces();

      params.server.setNextResponse(
        require('../workspaces/ruby-app-thresholds/test-graph-result-medium-severity.json'),
      );

      try {
        await params.cli.test('ruby-app-thresholds', {
          severityThreshold: 'medium',
          json: true,
        });
        t.fail('should have thrown');
      } catch (err) {
        const req = params.server.popRequest();
        t.is(req.query.severityThreshold, 'medium');

        const res = JSON.parse(err.message);

        const expected = require('../workspaces/ruby-app-thresholds/legacy-res-json-medium-severity.json');

        t.deepEqual(
          _.omit(res, ['vulnerabilities']),
          _.omit(expected, ['vulnerabilities']),
          'metadata is ok',
        );
        t.deepEqual(
          _.sortBy(res.vulnerabilities, 'id'),
          _.sortBy(expected.vulnerabilities, 'id'),
          'vulns are the same',
        );
      }
    },

    '`test ruby-app-thresholds --severity-threshold=high': (
      params,
      utils,
    ) => async (t) => {
      utils.chdirWorkspaces();

      params.server.setNextResponse(
        require('../workspaces/ruby-app-thresholds/test-graph-result-high-severity.json'),
      );

      try {
        await params.cli.test('ruby-app-thresholds', {
          severityThreshold: 'high',
        });
        t.fail('should have thrown');
      } catch (err) {
        const req = params.server.popRequest();
        t.is(req.query.severityThreshold, 'high');

        const res = err.message;

        t.match(
          res,
          'Tested 7 dependencies for known vulnerabilities, found 3 vulnerabilities, 4 vulnerable paths',
          '3 vulns',
        );
      }
    },

    '`test ruby-app-thresholds --severity-threshold=high --json`': (
      params,
      utils,
    ) => async (t) => {
      utils.chdirWorkspaces();

      params.server.setNextResponse(
        require('../workspaces/ruby-app-thresholds/test-graph-result-high-severity.json'),
      );

      try {
        await params.cli.test('ruby-app-thresholds', {
          severityThreshold: 'high',
          json: true,
        });
        t.fail('should have thrown');
      } catch (err) {
        const req = params.server.popRequest();
        t.is(req.query.severityThreshold, 'high');

        const res = JSON.parse(err.message);

        const expected = require('../workspaces/ruby-app-thresholds/legacy-res-json-high-severity.json');

        t.deepEqual(
          _.omit(res, ['vulnerabilities']),
          _.omit(expected, ['vulnerabilities']),
          'metadata is ok',
        );
        t.deepEqual(
          _.sortBy(res.vulnerabilities, 'id'),
          _.sortBy(expected.vulnerabilities, 'id'),
          'vulns are the same',
        );
      }
    },

    '`test ruby-app-policy`': (params, utils) => async (t) => {
      utils.chdirWorkspaces();

      params.server.setNextResponse(
        require('../workspaces/ruby-app-policy/test-graph-result.json'),
      );

      try {
        await params.cli.test('ruby-app-policy', {
          json: true,
        });
        t.fail('should have thrown');
      } catch (err) {
        const res = JSON.parse(err.message);

        const expected = require('../workspaces/ruby-app-policy/legacy-res-json.json');

        t.deepEqual(
          _.omit(res, ['vulnerabilities']),
          _.omit(expected, ['vulnerabilities']),
          'metadata is ok',
        );
        t.deepEqual(
          _.sortBy(res.vulnerabilities, 'id'),
          _.sortBy(expected.vulnerabilities, 'id'),
          'vulns are the same',
        );
      }
    },

    '`test ruby-app-policy` with cloud ignores': (params, utils) => async (
      t,
    ) => {
      utils.chdirWorkspaces();

      params.server.setNextResponse(
        require('../workspaces/ruby-app-policy/test-graph-result-cloud-ignore.json'),
      );

      try {
        await params.cli.test('ruby-app-policy', {
          json: true,
        });
        t.fail('should have thrown');
      } catch (err) {
        const res = JSON.parse(err.message);

        const expected = require('../workspaces/ruby-app-policy/legacy-res-json-cloud-ignore.json');

        t.deepEqual(
          _.omit(res, ['vulnerabilities']),
          _.omit(expected, ['vulnerabilities']),
          'metadata is ok',
        );
        t.deepEqual(
          _.sortBy(res.vulnerabilities, 'id'),
          _.sortBy(expected.vulnerabilities, 'id'),
          'vulns are the same',
        );
      }
    },

    '`test ruby-app-no-vulns`': (params, utils) => async (t) => {
      utils.chdirWorkspaces();

      params.server.setNextResponse(
        require('../workspaces/ruby-app-no-vulns/test-graph-result.json'),
      );

      const outText = await params.cli.test('ruby-app-no-vulns', {
        json: true,
      });

      const res = JSON.parse(outText);

      const expected = require('../workspaces/ruby-app-no-vulns/legacy-res-json.json');

      t.deepEqual(res, expected, '--json output is the same');
    },

    '`test ruby-app-no-vulns` public': (params, utils) => async (t) => {
      utils.chdirWorkspaces();

      const apiResponse = Object.assign(
        {},
        require('../workspaces/ruby-app-no-vulns/test-graph-result.json'),
      );
      apiResponse.meta.isPublic = true;
      params.server.setNextResponse(apiResponse);

      const outText = await params.cli.test('ruby-app-no-vulns', {
        json: true,
      });

      const res = JSON.parse(outText);

      const expected = Object.assign(
        {},
        require('../workspaces/ruby-app-no-vulns/legacy-res-json.json'),
        { isPrivate: false },
      );

      t.deepEqual(res, expected, '--json output is the same');
    },

    '`test` returns correct meta when target file specified': (
      params,
      utils,
    ) => async (t) => {
      utils.chdirWorkspaces();
      const res = await params.cli.test('ruby-app', { file: 'Gemfile.lock' });
      const meta = res.slice(res.indexOf('Organization:')).split('\n');
      t.match(meta[2], /Target file:\s+Gemfile.lock/, 'target file displayed');
    },

    '`test ruby-gem-no-lockfile --file=ruby-gem.gemspec`': (
      params,
      utils,
    ) => async (t) => {
      utils.chdirWorkspaces();
      await params.cli.test('ruby-gem-no-lockfile', {
        file: 'ruby-gem.gemspec',
      });
      const req = params.server.popRequest();
      t.equal(req.method, 'POST', 'makes POST request');
      t.equal(
        req.headers['x-snyk-cli-version'],
        params.versionNumber,
        'sends version number',
      );
      t.match(req.url, '/test-dep-graph', 'posts to correct url');

      const depGraph = req.body.depGraph;
      t.equal(depGraph.pkgManager.name, 'rubygems');
      t.same(
        depGraph.pkgs.map((p) => p.id),
        ['ruby-gem-no-lockfile@'],
        'no deps as we dont really support gemspecs yet',
      );
    },

    '`test ruby-gem --file=ruby-gem.gemspec`': (params, utils) => async (t) => {
      utils.chdirWorkspaces();
      await params.cli.test('ruby-gem', { file: 'ruby-gem.gemspec' });

      const req = params.server.popRequest();
      t.equal(req.method, 'POST', 'makes POST request');
      t.equal(
        req.headers['x-snyk-cli-version'],
        params.versionNumber,
        'sends version number',
      );
      t.match(req.url, '/test-dep-graph', 'posts to correct url');

      const depGraph = req.body.depGraph;
      t.equal(depGraph.pkgManager.name, 'rubygems');
      t.same(
        depGraph.pkgs.map((p) => p.id).sort(),
        ['ruby-gem@', 'ruby-gem@0.1.0', 'rake@10.5.0'].sort(),
        'depGraph looks fine',
      );
    },

    '`test ruby-app` auto-detects Gemfile': (params, utils) => async (t) => {
      utils.chdirWorkspaces();
      await params.cli.test('ruby-app');
      const req = params.server.popRequest();
      t.equal(req.method, 'POST', 'makes POST request');
      t.equal(
        req.headers['x-snyk-cli-version'],
        params.versionNumber,
        'sends version number',
      );
      t.match(req.url, '/test-dep-graph', 'posts to correct url');

      const depGraph = req.body.depGraph;
      t.equal(depGraph.pkgManager.name, 'rubygems');
      t.same(
        depGraph.pkgs.map((p) => p.id).sort(),
        ['ruby-app@', 'json@2.0.2', 'lynx@0.4.0'].sort(),
        'depGraph looks fine',
      );
      t.notOk(req.body.targetFile, 'does not specify target');
    },

    '`test monorepo --file=sub-ruby-app/Gemfile`': (params, utils) => async (
      t,
    ) => {
      utils.chdirWorkspaces();
      await params.cli.test('monorepo', { file: 'sub-ruby-app/Gemfile' });

      const req = params.server.popRequest();
      t.equal(req.method, 'POST', 'makes POST request');
      t.equal(
        req.headers['x-snyk-cli-version'],
        params.versionNumber,
        'sends version number',
      );
      t.match(req.url, '/test-dep-graph', 'posts to correct url');

      const depGraph = req.body.depGraph;
      t.equal(depGraph.pkgManager.name, 'rubygems');
      t.same(
        depGraph.pkgs.map((p) => p.id).sort(),
        ['monorepo@', 'json@2.0.2', 'lynx@0.4.0'].sort(),
        'depGraph looks fine',
      );

      t.notOk(req.body.targetFile, 'does not specify target');
    },

    '`test empty --file=Gemfile`': (params, utils) => async (t) => {
      utils.chdirWorkspaces();
      try {
        await params.cli.test('empty', { file: 'Gemfile' });
        t.fail('should have failed');
      } catch (err) {
        t.pass('throws err');
        t.match(
          err.message,
          'Could not find the specified file: Gemfile',
          'shows err',
        );
      }
    },
  },
};
