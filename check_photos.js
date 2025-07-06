const fs = require('fs');

// Read and parse the plant database
const content = fs.readFileSync('plantdatabase.js', 'utf8');

// Simple approach - count plants and photos
const nameMatches = content.match(/name: "/g);
const totalPlants = nameMatches ? nameMatches.length : 0;

const plantPhotoMatches = content.match(/plant_photo: "/g);
const flowerPhotoMatches = content.match(/flower_photo: "/g);
const fruitPhotoMatches = content.match(/fruit_photo: "/g);

const plantPhotos = plantPhotoMatches ? plantPhotoMatches.length : 0;
const flowerPhotos = flowerPhotoMatches ? flowerPhotoMatches.length : 0;
const fruitPhotos = fruitPhotoMatches ? fruitPhotoMatches.length : 0;

console.log('=== PHOTO ANALYSIS ===');
console.log('Total plants:', totalPlants);
console.log('Plants with plant_photo:', plantPhotos);
console.log('Plants with flower_photo:', flowerPhotos);
console.log('Plants with fruit_photo:', fruitPhotos);
console.log('Total photo entries:', plantPhotos + flowerPhotos + fruitPhotos);

// Find plants without any photos by looking for entries that don't have photo fields
const plantEntries = content.split(/},\s*{/).map(entry => entry.trim());
let plantsWithoutPhotos = 0;
let plantsWithoutPhotosList = [];

plantEntries.forEach(entry => {
    if (entry.includes('name: "')) {
        const nameMatch = entry.match(/name: "([^"]+)"/);
        const hasAnyPhoto = entry.includes('plant_photo:') || entry.includes('flower_photo:') || entry.includes('fruit_photo:');
        
        if (!hasAnyPhoto && nameMatch) {
            plantsWithoutPhotos++;
            plantsWithoutPhotosList.push(nameMatch[1]);
        }
    }
});

console.log('\n=== PLANTS WITHOUT PHOTOS ===');
console.log('Plants without any photos:', plantsWithoutPhotos);
console.log('Plants with photos:', totalPlants - plantsWithoutPhotos);
console.log('Photo coverage:', Math.round(((totalPlants - plantsWithoutPhotos) / totalPlants) * 100) + '%');

console.log('\nPlants still needing photos:');
plantsWithoutPhotosList.forEach((name, index) => {
    console.log(`${index + 1}. ${name}`);
});