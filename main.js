// Define study area
var AOI = ee.Geometry.Polygon(
  [[
    [-82.9, 27.5],
    [-82.9, 24.5],
    [-79.8, 24.5],
    [-79.8, 27.5]
  ]]
);

Map.centerObject(AOI, 8);

// Cloud masking using QA_PIXEL
function maskClouds(image) {
  var qa = image.select('QA_PIXEL');
  var cloudShadow = 1 << 3;
  var clouds = 1 << 5;

  var mask = qa.bitwiseAnd(cloudShadow).eq(0)
               .and(qa.bitwiseAnd(clouds).eq(0));

  return image.updateMask(mask);
}

// Rename Landsat 5/7 bands
function renameL57(image) {
  return image.select(
    ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7'],
    ['Blue','Green','Red','NIR','SWIR1','SWIR2']
  );
}

// Rename Landsat 8/9 bands
function renameL89(image) {
  return image.select(
    ['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7'],
    ['Blue','Green','Red','NIR','SWIR1','SWIR2']
  );
}

// Load and preprocess Landsat collections
var l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
  .filterBounds(AOI)
  .map(maskClouds)
  .map(renameL57);

var l7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
  .filterBounds(AOI)
  .map(maskClouds)
  .map(renameL57);

var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(AOI)
  .map(maskClouds)
  .map(renameL89);

var l9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(AOI)
  .map(maskClouds)
  .map(renameL89);

var landsatAll = l5.merge(l7).merge(l8).merge(l9);

// Create yearly composite
function getYearComposite(year) {
  var start = ee.Date.fromYMD(year, 1, 1);
  var end   = ee.Date.fromYMD(year, 12, 31);

  return landsatAll
    .filterDate(start, end)
    .median()
    .clip(AOI)
    .set('year', year);
}

// Add NDVI and NDWI
function addIndices(image) {
  var ndvi = image.normalizedDifference(['NIR','Red']).rename('NDVI');
  var ndwi = image.normalizedDifference(['Green','NIR']).rename('NDWI');
  return image.addBands([ndvi, ndwi]);
}

var img1990 = addIndices(getYearComposite(1990));
var img2020 = addIndices(getYearComposite(2020));

// Generate land and water masks
function getWaterMask(image) {
  return image.select('NDWI').gt(0).rename('Water');
}

function getLandMask(image) {
  return image.select('NDWI').lte(0).rename('Land');
}

var water1990 = getWaterMask(img1990);
var water2020 = getWaterMask(img2020);

var land1990 = getLandMask(img1990);
var land2020 = getLandMask(img2020);

// Convert water masks to polygons (shoreline proxy)
function getWaterPolygons(image, year) {
  var waterMask = image.select('NDWI').gt(0).selfMask();

  return waterMask.reduceToVectors({
    geometry: AOI,
    scale: 30,
    geometryType: 'polygon',
    maxPixels: 1e12
  }).map(function(f) {
    return f.set('year', year);
  });
}

var shoreline1990 = getWaterPolygons(img1990, 1990);
var shoreline2020 = getWaterPolygons(img2020, 2020);

// Calculate land area
function calculateLandArea(mask) {
  var areaImage = mask.eq(1)
    .multiply(ee.Image.pixelArea())
    .rename('Area');

  var stats = areaImage.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: AOI,
    scale: 30,
    maxPixels: 1e13
  });

  return ee.Number(stats.get('Area'));
}

var area1990 = calculateLandArea(land1990);
var area2020 = calculateLandArea(land2020);

print('Land area 1990 (m²):', area1990);
print('Land area 2020 (m²):', area2020);
print('Land loss (m²):', area1990.subtract(area2020));
print('Land loss (km²):', area1990.subtract(area2020).divide(1e6));

// Visualization
Map.addLayer(img1990.select('NDVI'), {min:0, max:1, palette:['white','green']}, 'NDVI 1990');
Map.addLayer(img2020.select('NDVI'), {min:0, max:1, palette:['white','darkgreen']}, 'NDVI 2020');

Map.addLayer(water1990.selfMask(), {palette:['cyan']}, 'Water 1990');
Map.addLayer(water2020.selfMask(), {palette:['blue']}, 'Water 2020');

Map.addLayer(shoreline1990.style({color:'red', fillColor:'00000000'}), {}, 'Shoreline 1990');
Map.addLayer(shoreline2020.style({color:'yellow', fillColor:'00000000'}), {}, 'Shoreline 2020');
