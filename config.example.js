var config = {
    slackApiKey: "",
    slackSlashToken: "",
    wolframAlphaApiKey: "",
    cloudinaryApiKey: "",
    cloudinaryApiSecret: "",
    cloudinaryName: "",
    slackSlackPort: 3000,
    metric: [
        // length
        'cm', 'meters', 'centimeters', 'dm', 'm', 'mm', 'km',
        // volume
        'liters', 'liter', 'L', 'dl', 'ml',
        // area
        'm^2', 'sq m',
        'ha', 'hectare',
        // mass
        'g', 'kg', 'mg', 'metric ton',
        'ton', 't', 'tons', 'metric tons',
        // compounds
        'km/h', 'kmh',
        'L/100 km',
        // temperature
        'C', 'degrees C', '° C', '°C'],
    imperial: [
        // length
        'thou', 'th',
        '"', 'in', 'inches', 'inch',
        'ft', 'feet', 'foot',
        'yard', 'yards', 'yd',
        'chain', 'ch', 'chains',
        'furlong', 'fur', 'furlongs',
        'mile', 'miles', 'mi',
        'league', 'lea', 'leagues',
        'fathom', 'ftm', 'fathoms',
        'cable', 'cables',
        'nautical mile', 'nautical miles', 'naut mile', 'naut miles',
        'link', 'links',
        'rod', 'rods',
        // area
        'perch',
        'rood',
        'acre',
        // volume
        'fluid ounce', 'fl oz', 'oz',
        'gill', 'gi',
        'pint', 'pt', 'pints',
        'quart', 'qt', 'quarts',
        'gallons', 'gallon', 'gal',
        // mass
        'grain', 'gr',
        'drachm', 'dr',
        'ounce', 'oz',
        'pound', 'lb',
        'stone', 'st',
        'slug',
        'quarter', 'qr', 'qtr',
        'hundretweight', 'cwt',
        // compounds
        'mph', 'm/h',
        'miles per gallon', 'mpg',
        // temperature
        'F', 'degrees F', '° F', '°F']
};

module.exports = config;