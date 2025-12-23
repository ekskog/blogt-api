const debug = require('debug')('blogt-api:archive-route');
const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs').promises;
const postsDir = path.join(__dirname, '..', 'posts');

router.get('/archives', async (req, res) => {
	let filePath = path.join(postsDir, `archive.json`);
	debug('File path:', filePath);

	try {
		const data = await fs.readFile(filePath, 'utf-8');
		const jsonData = JSON.parse(data);
		res.json(jsonData);
	} catch (err) {
		console.error('Error reading archives file:', err);
		res.status(500).send('Failed to fetch archives.');
	}
});

router.get('/buildarchives', async (req, res) => {
	try {
		const buildArchives = async (dir) => {
			const items = await fs.readdir(dir, { withFileTypes: true });
			const structure = {};

			for (const item of items) {
				const itemPath = path.join(dir, item.name);

				if (item.isDirectory()) {
					structure[item.name] = await buildArchives(itemPath);
				} else if (item.isFile() && item.name.endsWith('.md')) {
					const day = path.basename(item.name, '.md');
					if (!structure.files) structure.files = [];
					structure.files.push(day);
				}
			}

			return structure.files ? structure.files : structure;
		};

		const archives = await buildArchives(postsDir);

		const formatArchives = (rawStructure) => {
			const formatted = {};
			for (const year in rawStructure) {
				if (typeof rawStructure[year] === 'object') {
					formatted[year] = {};
					for (const month in rawStructure[year]) {
						if (Array.isArray(rawStructure[year][month])) {
							formatted[year][month] = rawStructure[year][month];
						}
					}
				}
			}
			return formatted;
		};

		const formattedArchives = formatArchives(archives);
		res.json(formattedArchives);
	} catch (err) {
		console.error('Error building archives:', err);
		res.status(500).send('Failed to fetch archives.');
	}
});

module.exports = router;
