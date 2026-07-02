const fs = require('fs');
const path = require('path');
const https = require('https');

const urls = {
  candidate_profile: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzY2ZTE5ZDUyYjQ2YzRjMmE4YWIyYTdmY2U4MWIzMjgzEgsSBxDwst-jqxMYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjQ3ODE2MzUwNzkwNjk1NTc3OA&filename=&opi=89354086',
  admin_dashboard: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2Q3NWRkNzUzNDdmNjQ5NjJiMTBiNTIzMzZiODJjMDY0EgsSBxDwst-jqxMYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjQ3ODE2MzUwNzkwNjk1NTc3OA&filename=&opi=89354086',
  candidate_search: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzBiNTE2N2NmNTBhODQ0MWNhMGE0YWI2NzE1MWNkZWNkEgsSBxDwst-jqxMYAZIBIwoKcHJvamVjdF9pZBIVQhMzMDYzMzU2NjExMTMzNjg4NDg1&filename=&opi=89354086',
  user_management: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2U0NTI3ZWYwYjdlYzQ3Y2NhNWUyZmVhODgwMTZhNTFiEgsSBxDwst-jqxMYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDA0NDY1NjMwMzY2MTc1ODI0Nw&filename=&opi=89354086',
  reports_dashboard: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2EzY2VkNzljMzQ5NjQ1Mzk4ZDJiYTBlOGMxYWVjOWJhEgsSBxDwst-jqxMYAZIBJAoKcHJvamVjdF9pZBIWQhQxMjczODE1MjQ4OTYwMTMyMTQ1Ng&filename=&opi=89354086',
  system_settings_f5b: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzU2MTlkOTU0ZDlhYTQwZGVhNzgzMWQ5MzM2ZWI3YjM4EgsSBxDwst-jqxMYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDQ5Mzc1NDMwNDU1MzIyODA2OQ&filename=&opi=89354086',
  system_settings_5a6: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzJiYzExZmNiNDE3YzRhZTdiZDMxOTc3YzM4YzgxZDE3EgsSBxDwst-jqxMYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDQ5Mzc1NDMwNDU1MzIyODA2OQ&filename=&opi=89354086'
};

const outputDir = path.join(__dirname, '../src/stitch-temp');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function download(name, url) {
  const filePath = path.join(outputDir, `${name}.html`);
  const file = fs.createWriteStream(filePath);
  https.get(url, (res) => {
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`[Success] Downloaded: ${name}.html`);
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {});
    console.error(`[Error] Failed ${name}:`, err.message);
  });
}

Object.entries(urls).forEach(([name, url]) => {
  download(name, url);
});
