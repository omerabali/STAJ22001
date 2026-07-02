const fs = require('fs');

const logPath = 'C:/Users/MSI/.gemini/antigravity-ide/brain/8ede1dcc-8c01-4ec9-a4db-9440cd515499/.system_generated/steps/608/output.txt';
const fileContent = fs.readFileSync(logPath, 'utf8');
const data = JSON.parse(fileContent);

const targetProjects = [
  'projects/16478163507906955778', // Beacon Candidate Analysis Platform
  'projects/3063356611133688485',  // Beacon Career Design System
  'projects/14044656303661758247', // Beacon Design System Redesign
  'projects/12738152489601321456', // Beacon Clean Career Platform
  'projects/10493754304553228069'  // Beacon Light Career System
];

targetProjects.forEach(projectId => {
  const project = data.projects.find(p => p.name === projectId);
  if (project) {
    console.log(`\n=== PROJECT: ${project.title} (${project.name}) ===`);
    if (project.screenInstances) {
      project.screenInstances.forEach(screen => {
        // Log all fields of screen instance to see where title is stored
        console.log(JSON.stringify(screen, null, 2));
      });
    }
  }
});
