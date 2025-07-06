const fs = require('fs');

// Read and parse the plant database
const content = fs.readFileSync('plantdatabase.js', 'utf8');
// Extract just the array part
const arrayMatch = content.match(/window\.plantsDatabase = (\[[\s\S]*\]);/);
if (!arrayMatch) {
    console.error('Could not parse plant database');
    process.exit(1);
}

const plantsDatabase = eval(arrayMatch[1]);

let totalPlants = 0;
let plantsWithoutAnyPhotos = 0;
let plantsWithPhotos = 0;
let plantsWithoutPhotos = [];

plantsDatabase.forEach(plant => {
    totalPlants++;
    const hasPhotos = plant.plant_photo || plant.flower_photo || plant.fruit_photo;
    
    if (hasPhotos) {
        plantsWithPhotos++;
    } else {
        plantsWithoutAnyPhotos++;
        plantsWithoutPhotos.push({
            name: plant.name,
            botanical: plant.botanical,
            category: plant.category
        });
    }
});

console.log('=== PHOTO ANALYSIS ===');
console.log('Total plants:', totalPlants);
console.log('Plants with at least one photo:', plantsWithPhotos);
console.log('Plants without any photos:', plantsWithoutAnyPhotos);
console.log('Percentage with photos:', Math.round((plantsWithPhotos / totalPlants) * 100) + '%');
console.log('Percentage without photos:', Math.round((plantsWithoutAnyPhotos / totalPlants) * 100) + '%');

console.log('\n=== PLANTS WITHOUT PHOTOS ===');
plantsWithoutPhotos.forEach((plant, index) => {
    console.log(`${index + 1}. ${plant.name} (${plant.botanical}) - ${plant.category}`);
});