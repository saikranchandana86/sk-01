# Chart Component - Quick Start Guide

## Getting Started with Charts in 3 Easy Steps

### Step 1: Create or Setup a Demo API

#### Option A: Use the Demo API (Fastest Way)
1. Click on **"APIs"** in the left panel
2. If you have no APIs, click **"Setup Demo API"** button
3. The demo API will automatically run and fetch real data from `https://reqres.in/api/users`

#### Option B: Create Your Own API
1. Click on **"APIs"** in the left panel
2. Click the **"+"** button or **"Create your first API"**
3. Fill in:
   - **Name**: e.g., "getUsersAPI"
   - **Method**: GET
   - **URL**: e.g., `https://reqres.in/api/users`
4. Click **"Create"**
5. Click the **Play button** (▶) to run the API

### Step 2: Add a Chart Component
1. From the left panel, click **"Components"**
2. Scroll to find **"Chart"** component
3. Drag and drop it onto the canvas
4. Click on the chart to select it

### Step 3: Bind Data to the Chart
1. With the chart selected, look at the **Properties Panel** on the right
2. Click on the **"Content"** or **"Data"** tab
3. Scroll down to **"Chart series"** section
4. In the "Series data" field, type `{{` and you'll see autocomplete suggestions
5. Select your API (e.g., `getUsersAPI`)
6. Complete the binding, for example:
   ```javascript
   {{getUsersAPI.data.data.map(user => ({ x: user.first_name, y: user.id }))}}
   ```

## Complete Working Example

### Example 1: Simple User Chart
```javascript
// Series Data:
{{getUsersAPI.data.data.map(user => ({ x: user.first_name, y: user.id }))}}

// This transforms the API response:
// From: { data: { data: [{id: 1, first_name: "John"}, ...] } }
// To: [{ x: "John", y: 1 }, ...]
```

### Example 2: Email Domain Distribution
```javascript
// Series Data:
{{Object.entries(
  getUsersAPI.data.data.reduce((acc, user) => {
    const domain = user.email.split('@')[1];
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {})
).map(([x, y]) => ({ x, y }))}}

// This groups users by email domain and counts them
```

### Example 3: Multiple Series (Comparison Chart)
**Series 1:**
```javascript
{{getUsersAPI.data.data.slice(0, 3).map(user => ({ x: user.first_name, y: user.id }))}}
```

**Series 2:**
```javascript
{{getUsersAPI.data.data.slice(3, 6).map(user => ({ x: user.first_name, y: user.id }))}}
```

## Understanding the Autocomplete

### When you type `{{`
You'll see:
- **Available APIs** - All created APIs with status indicators
- **Available Queries** - All SQL queries with status indicators
- **Quick Templates** - Pre-built patterns for common transformations

### When you type `{{apiName.`
You'll see:
- `.data` - Access the response data
- `.response` - Access the full response
- `.isLoading` - Check loading status
- `.error` - Access error messages

### When you type `{{apiName.data.`
You'll see array methods:
- `.map()` - Transform data
- `.filter()` - Filter data
- `.sort()` - Sort data
- `.slice()` - Get subset
- `.reduce()` - Aggregate data
- `.find()` - Find specific item

## Troubleshooting

### Chart shows "No data available"

**Problem**: API hasn't been executed
**Solution**:
1. Go to the APIs panel
2. Find your API
3. Click the Run button (▶) next to it
4. Wait for the green checkmark

**Problem**: Wrong data path
**Solution**: Check the API response structure
1. Click on the API in the APIs panel
2. Look at the response in the right panel
3. Adjust your data binding path accordingly

### Autocomplete not showing APIs

**Problem**: No APIs created yet
**Solution**:
1. Create an API first (see Step 1)
2. Make sure the API has a unique ID

### Data format errors

**Problem**: Chart expects `{x, y}` format
**Solution**: Always transform your data to match this format:
```javascript
// CORRECT
{{apiName.data.map(item => ({ x: item.name, y: item.value }))}}

// INCORRECT
{{apiName.data}}  // Raw array without transformation
```

## Common Patterns

### Pattern 1: Direct Mapping
```javascript
{{apiName.data.map(item => ({ x: item.label, y: item.value }))}}
```

### Pattern 2: Filtering First
```javascript
{{apiName.data
  .filter(item => item.active === true)
  .map(item => ({ x: item.name, y: item.count }))
}}
```

### Pattern 3: Sorting
```javascript
{{apiName.data
  .sort((a, b) => b.value - a.value)
  .map(item => ({ x: item.name, y: item.value }))
}}
```

### Pattern 4: Top N Items
```javascript
{{apiName.data
  .sort((a, b) => b.sales - a.sales)
  .slice(0, 10)
  .map(item => ({ x: item.product, y: item.sales }))
}}
```

### Pattern 5: Date Formatting
```javascript
{{apiName.data.map(item => ({
  x: new Date(item.timestamp).toLocaleDateString(),
  y: item.value
}))}}
```

### Pattern 6: Aggregation
```javascript
{{Object.entries(
  apiName.data.reduce((acc, item) => {
    const key = item.category;
    acc[key] = (acc[key] || 0) + item.amount;
    return acc;
  }, {})
).map(([x, y]) => ({ x, y }))}}
```

## Chart Types

- **Column Chart**: Vertical bars (default)
- **Bar Chart**: Horizontal bars
- **Line Chart**: Connected line graph
- **Area Chart**: Filled area under line
- **Pie Chart**: Circular percentage view
- **Custom**: Full ECharts configuration

## Advanced Features

### Export Data
Click the Download icon in the chart header to export as CSV

### Fullscreen Mode
Click the Maximize icon to view chart in fullscreen

### Interactive Selection
Click on data points to view details (shown at bottom of chart)

### Custom Styling
Use the Properties Panel → Style tab to customize:
- Colors
- Grid lines
- Labels
- Borders
- Legend position

## Tips for Success

1. **Always run APIs first** before binding to charts
2. **Use the autocomplete** - it shows you what's available
3. **Check API responses** in the APIs panel to understand data structure
4. **Transform data** to `{x, y}` format
5. **Test with simple data** first, then add complexity
6. **Use console** if you need to debug transformations
7. **Save frequently** as you build

## Need Help?

The chart component provides helpful hints:
- **In the chart**: Step-by-step instructions when no data is shown
- **In properties**: Quick tips box with examples
- **Debug info**: Shows API status and what data is available
- **Autocomplete**: Real-time suggestions as you type

---

Happy charting! 📊
