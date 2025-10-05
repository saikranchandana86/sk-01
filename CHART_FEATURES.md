# Chart Component - Full AppSmith-like Functionality

## Overview
The Chart component now provides comprehensive data visualization capabilities similar to AppSmith, with intelligent autocomplete, multiple chart types, and advanced data binding.

## Features Implemented

### 1. Intelligent Autocomplete
When typing in the chart series data field, you get:

#### API/Query Detection
- Type `{{` to see all available APIs and SQL queries
- Real-time status indicators:
  - ✓ Has data - API/Query has been executed successfully
  - ⚠ No data yet - Need to run the API/Query first

#### Property Suggestions
After typing an API/Query name and `.`, you get:
- `.data` - Access the response data
- `.response` - Access the full response object
- `.isLoading` - Check if request is in progress
- `.error` - Access error message if any

#### Array Method Autocomplete
After `.data`, you get smart suggestions for:
- `.map()` - Transform array to chart format
- `.filter()` - Filter data based on conditions
- `.slice()` - Get a subset of data
- `.sort()` - Sort data by any field
- `.reduce()` - Aggregate/group data
- `.find()` - Find specific items

### 2. Chart Data Templates
Built-in snippets for common patterns:

1. **Map API data to chart**
   ```javascript
   {{apiName.data.map(item => ({ x: item.labelField, y: item.valueField }))}}
   ```

2. **Map with date formatting**
   ```javascript
   {{apiName.data.map(item => ({ x: new Date(item.timestamp).toLocaleDateString(), y: item.value }))}}
   ```

3. **Filter and map data**
   ```javascript
   {{apiName.data.filter(item => item.status === "active").map(item => ({ x: item.name, y: item.count }))}}
   ```

4. **Top N items**
   ```javascript
   {{apiName.data.sort((a, b) => b.value - a.value).slice(0, 10).map(item => ({ x: item.name, y: item.value }))}}
   ```

5. **Group and sum by category**
   ```javascript
   {{Object.entries(apiName.data.reduce((acc, item) => {
     const key = item.category;
     acc[key] = (acc[key] || 0) + item.value;
     return acc;
   }, {})).map(([x, y]) => ({ x, y }))}}
   ```

### 3. Chart Types Supported
- **Column Chart** - Vertical bars
- **Bar Chart** - Horizontal bars
- **Line Chart** - Connected line graph
- **Area Chart** - Filled area under line
- **Pie Chart** - Circular percentage visualization
- **Custom EChart** - Full ECharts configuration support

### 4. Chart Configuration Options

#### General Settings
- Title
- X-Axis Name
- Y-Axis Name
- Show Data Labels
- Show Legend
- Legend Position (top, bottom, left, right)
- Enable Tooltips
- Visibility control

#### Style Settings
- Label Orientation (auto, horizontal, vertical, slant)
- Label Text Size
- Grid Line Color
- Background Color
- Border Color
- Border Width
- Border Radius

#### Data Binding
- Multiple series support
- Individual series color selection
- Series-specific data binding
- Real-time data evaluation

### 5. Interactive Features
- **Hover Effects** - Visual feedback on data points
- **Click Events** - Execute actions on data point click
- **Export Data** - Download chart data as CSV
- **Refresh** - Reload chart data
- **Fullscreen Mode** - Expand chart for better viewing
- **Tooltips** - Show data point values on hover

### 6. Advanced Data Handling
- Automatic data type detection
- Support for various data formats:
  - Array of objects: `[{x: "A", y: 10}, {x: "B", y: 20}]`
  - Named fields: `[{label: "A", value: 10}]`
  - Nested properties: `[{name: "A", count: 10}]`
  - Simple arrays: `[10, 20, 30]`

### 7. Real-time Evaluation
- Dynamic expression evaluation
- Access to global state
- Component property references
- Live data updates

## Usage Examples

### Example 1: Simple API Data
```javascript
{{getUsersAPI.data.map(user => ({ x: user.name, y: user.age }))}}
```

### Example 2: Filtered Data
```javascript
{{getUsersAPI.data
  .filter(user => user.active === true)
  .map(user => ({ x: user.department, y: user.salary }))}}
```

### Example 3: Aggregated Data
```javascript
{{Object.entries(
  salesAPI.data.reduce((acc, sale) => {
    const month = new Date(sale.date).getMonth();
    acc[month] = (acc[month] || 0) + sale.amount;
    return acc;
  }, {})
).map(([month, total]) => ({ x: `Month ${month}`, y: total }))}}
```

### Example 4: Top Performers
```javascript
{{salesAPI.data
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 10)
  .map(item => ({ x: item.salesperson, y: item.revenue }))}}
```

### Example 5: Multiple Series
Series 1:
```javascript
{{salesAPI.data.map(item => ({ x: item.month, y: item.revenue2023 }))}}
```

Series 2:
```javascript
{{salesAPI.data.map(item => ({ x: item.month, y: item.revenue2024 }))}}
```

## Best Practices

1. **Always run APIs/Queries first** before binding to charts
2. **Use consistent data formats** - stick to {x, y} format
3. **Handle missing data** - filter out null/undefined values
4. **Optimize performance** - limit data points for large datasets
5. **Use meaningful labels** - provide clear x-axis values
6. **Choose appropriate chart types** - match visualization to data type
7. **Test with real data** - verify transformations work correctly

## Troubleshooting

### Chart shows "No data available"
- Check if API/Query has been executed
- Verify data transformation returns an array
- Check console for evaluation errors
- Ensure data format matches {x, y} structure

### Autocomplete not working
- Make sure you're typing `{{` to trigger suggestions
- Verify APIs/Queries are created in the APIs/Queries panel
- Check that APIs have unique IDs

### Data not displaying correctly
- Verify y-values are numbers, not strings
- Check for null/undefined values in data
- Ensure x-values are unique for each data point
- Review console logs for transformation issues

## Future Enhancements
- Drill-down capabilities
- Custom color palettes
- Animation controls
- Advanced zoom and pan
- Data point annotations
- Threshold lines
- Trendlines and forecasting
- Real-time data streaming
