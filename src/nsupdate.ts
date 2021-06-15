#!/usr/bin/env node

import { read } from 'doge-json';
import fetch from 'node-fetch';
import fs from 'fs';
import run from 'nslibmgr/lib/run';
import semver from 'semver';

async function get_latest_version (pkg: string) {
	return fetch(`https://api.npms.io/v2/package/${pkg}`)
	.then(res => res.json())
	.then(res => res.collected.metadata.version)
}

async function nsupdate () {
	try {
		const { dependencies: yarn_packages } = read(`/usr/local/share/.config/yarn/global/package.json`);
		if (!yarn_packages['n']) await run('yarn global add n');
		await run('sudo n -p lts');
		for (const [ pkg, ver ] of Object.entries(yarn_packages)) {
			const remote_version = await get_latest_version(pkg);
			if (semver.compare(semver.coerce(`${ver}`) || '0.0.0', remote_version) === -1) {
				console.log(`${pkg}: You have ${ver}, installing ${remote_version}`);
				await run(`yarn global add ${pkg}`);
			}
		}
		const npm_packages = await fs.promises.readdir('/usr/local/lib/node_modules');
		for (const pkg of npm_packages) {
			await run(`sudo npm r -g ${pkg}`);
			await run(`yarn global add ${pkg}`);
		}
		console.log(`Updated all packages.`);
	} catch (error) {
		if (process.platform !== 'linux') {
			console.log('This program is only available for GNU/Linux.');
		} else {
			console.log(error);
		}
	}
}

nsupdate();
