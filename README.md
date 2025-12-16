# Southern Florida Coastal Change Analysis

Google Earth Engine script analyzing coastal land loss and vegetation degradation in Southern Florida (1990-2020) using Landsat imagery.

## Features

- Processes Landsat 5/7/8/9 imagery with cloud masking
- Calculates NDVI (vegetation) and NDWI (water)
- Generates land/water masks and shoreline polygons
- Computes land area loss between 1990 and 2020

## Usage

1. Open [Google Earth Engine Code Editor](https://code.earthengine.google.com/)
2. Paste and run the script
3. View land loss statistics in Console
4. Toggle map layers to compare 1990 vs 2020 changes

## Outputs

- Land area change (m² and km²)
- NDVI layers (vegetation health)
- Water extent and shoreline comparison maps