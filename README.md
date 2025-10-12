# Trading212 Portfolio Tracker for Google Sheets

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Google Sheets](https://img.shields.io/badge/Google-Sheets-34A853?logo=google-sheets&logoColor=white)](https://www.google.com/sheets/about/)
[![Trading212](https://img.shields.io/badge/Trading212-API-00D09C)](https://www.trading212.com/)

A powerful Google Sheets add-on that automatically syncs your Trading212 portfolio data, giving you complete visibility and control over your investments in a familiar spreadsheet environment.

## 🌟 Why Use This Tool?

- **📊 Complete Portfolio View** - All your Trading212 data in one place
- **🔄 Automatic Syncing** - Fetch latest portfolio data with a single click
- **💰 Detailed Analytics** - Track pies, transactions, dividends, and order history
- **🎨 Smart Formatting** - Automatic currency, date, and number formatting
- **🔒 Secure** - Your API key is stored securely in your Google account
- **🆓 Free & Open Source** - No subscriptions or hidden costs

## ✨ Features

### Data Synchronization
- 🥧 **Investment Pies** - View all your pie allocations and holdings
- 💵 **Cash Balance** - Track available and invested cash
- 📊 **Portfolio Positions** - Current holdings with live prices and P&L
- 📈 **Transactions** - Complete transaction history with pagination
- 📝 **Order History** - Detailed order execution records
- 💎 **Dividends** - Track all dividend payments
- 🏢 **Instruments List** - Full list of available trading instruments
- 🌍 **Exchange Information** - Exchange details and metadata

### Portfolio Analytics
- 📊 **Returns Dashboard** - Calculate Time-Weighted Returns (TWR) for your portfolio
  - Daily, weekly, monthly, yearly, and all-time returns
  - Separates investment performance from deposits/withdrawals
  - Modified Dietz method for accurate calculations
  - Automatic updates when fetching new data

### User Experience
- ✅ **Setup Wizard** - Guided setup process for first-time users
- 🔄 **Progress Tracking** - Real-time progress updates during data fetching
- ⚡ **Intelligent Rate Limiting** - Automatic API rate limit handling
- 🎨 **Customizable Formatting** - Configure how your data appears
- 🔐 **Demo & Live Support** - Test with demo account before going live

## 🚀 Getting Started

### Prerequisites

1. A [Trading212](https://www.trading212.com/) account (demo or live)
2. A Google account with access to Google Sheets
3. Your Trading212 API key ([learn how to generate one](https://helpcentre.trading212.com/hc/en-us/articles/14584770928157-How-can-I-generate-an-API-key))

### Installation

#### Option A: Use the Template (Recommended)
*Coming soon - Direct template link will be provided*

#### Option B: Manual Installation

1. **Create a new Google Sheet**
   - Go to [Google Sheets](https://sheets.google.com)
   - Create a new blank spreadsheet

2. **Open the Script Editor**
   - Click `Extensions` → `Apps Script`

3. **Add the Code**
   - Delete any existing code in the editor
   - Copy all files from this repository into your Apps Script project
   - Maintain the folder structure: `api/`, `data/`, `ui/`, `main/`, `html/`, `css/`, `js/`

4. **Save and Refresh**
   - Save the project (File → Save)
   - Refresh your Google Sheet
   - You should see a new `Trading212 Portfolio` menu appear

### First-Time Setup

1. **Open the Setup Wizard**
   - In your Google Sheet, click `Trading212 Portfolio` → `Setup` → `Start Setup`

2. **Choose Your Environment**
   - Select `Demo Environment` to test with paper trading
   - Select `Live Environment` to connect to your real account

3. **Enter Your API Key**
   - Paste your Trading212 API key
   - Click `Test Connection` to verify it works
   - If successful, click `Next` to continue

4. **Start Fetching Data**
   - Once setup is complete, you can start fetching your portfolio data

5. **Setup Returns Dashboard** (Optional)
   - Click `Trading212 Portfolio` → `Returns` → `Setup Returns Dashboard`
   - This creates sheets for tracking your portfolio performance
   - Calculates daily, weekly, monthly, and yearly returns

### Portfolio Returns & Analytics

Want to track your investment performance? The Returns Dashboard calculates Time-Weighted Returns (TWR) - the industry-standard method for measuring portfolio performance.

#### Setup Returns Dashboard
1. **Ensure Prerequisites**
   - Fetch Portfolio data at least once
   - Fetch Transactions data
   - Fetch Cash Balance data
   - Your Historical_shares and Historical_avg_price_paid sheets must exist

2. **Run Setup**
   - Click `Trading212 Portfolio` → `Returns` → `Setup Returns Dashboard`
   - This creates two new sheets:
     - **Daily_Portfolio_Values**: Calculates your portfolio value for each day
     - **Returns_Dashboard**: Shows returns for various time periods

3. **View Your Returns**
   - Open the `Returns_Dashboard` sheet
   - See returns for: Today, Last 7 Days, Last 30 Days, Year to Date, All Time
   - Returns automatically update when you fetch new Portfolio data

4. **Access Documentation**
   - Click `Trading212 Portfolio` → `Returns` → `View Documentation`
   - Links to comprehensive implementation guides and troubleshooting

#### Understanding Time-Weighted Return

**Why TWR matters:**
- Separates your investment skill from deposit/withdrawal timing
- Industry-standard metric used by professional fund managers
- Fair comparison across different time periods

**Example:**
```
Portfolio grew from €10,000 to €10,500 in a month
You deposited €300 during that month

Simple Return: 5% (but includes your deposit!)
TWR: 2% (actual investment performance)
```

For detailed documentation, see:
- [TWR Formula Templates](docs/TWR_Formula_Templates.md) - Technical implementation guide
- [Visual Guide](docs/Returns_Dashboard_Visual_Guide.md) - User-friendly reference

## 📖 How to Use

### Fetching Data

#### Quick Fetch
1. Click `Trading212 Portfolio` → `Data` → `Fetch Data...`
2. Select the data types you want to fetch
3. Watch the progress as your data loads

#### Individual Data Types
You can also fetch individual data types directly from the menu:
- `Trading212 Portfolio` → `Data` → `Fetch Pies`
- `Trading212 Portfolio` → `Data` → `Fetch Transactions`
- etc.

### Available Data Types

| Data Type | Description | Sheet Name |
|-----------|-------------|------------|
| **Pies** | Your investment pies and their allocations | 🥧Pies |
| **Instruments** | List of all available trading instruments | InstrumentsList |
| **Exchanges** | Exchange information and metadata | ExchangeList |
| **Account Info** | Your account details and settings | AccountInfo |
| **Cash Balance** | Available and invested cash balances | Cash |
| **Portfolio** | Current holdings with prices and P&L | Portfolio |
| **Transactions** | Complete transaction history | 212Transactions |
| **Order History** | Detailed order execution records | History |
| **Dividends** | All dividend payments received | Dividends |
| **Returns Dashboard** | Time-Weighted Returns for various periods | Returns_Dashboard |
| **Daily Portfolio Values** | Historical portfolio valuations | Daily_Portfolio_Values |

### Understanding the Data

Each data type is fetched into its own sheet with appropriate column headers:

- **Dates** are formatted according to your preferences
- **Currency values** are automatically formatted with the correct symbol
- **Percentages** are displayed as percentages, not decimals
- **Numbers** are formatted with appropriate decimal places

### Customizing Formatting

1. **Setup Format System**
   - Click `Trading212 Portfolio` → `Formatting` → `Setup Format System`
   - This creates two special sheets: `FormatConfigurations` and `ColumnFormatMapping`

2. **Configure Formats**
   - Open the `FormatConfigurations` sheet
   - Use the dropdowns to select your preferred formats for currency, dates, etc.

3. **Apply to Columns**
   - Open the `ColumnFormatMapping` sheet
   - Change the format category for specific columns
   - Formatting is applied automatically

4. **Refresh Column Mapping**
   - After adding new data types, click `Trading212 Portfolio` → `Formatting` → `Refresh Column Mapping`

## 🔧 Troubleshooting

### Connection Issues

**Problem**: "Connection failed. Please check your API key."
- **Solution**: Verify your API key is correct and not expired
- **Solution**: Check you've selected the correct environment (demo vs. live)
- **Solution**: Try regenerating your API key in Trading212

**Problem**: "Rate limit exceeded."
- **Solution**: Wait a few minutes before trying again
- **Solution**: The add-on has built-in rate limiting, but manual retries may trigger limits

### Data Issues

**Problem**: "No data appearing in sheets"
- **Solution**: Check that you've completed the setup process
- **Solution**: Verify your API key is saved (Trading212 Portfolio → Setup → Start Setup)
- **Solution**: Try fetching a single data type first (e.g., Account Info)

**Problem**: "Old data not being replaced"
- **Solution**: Sheets are cleared before new data is written
- **Solution**: Check you don't have protected ranges blocking updates

### Setup Issues

**Problem**: "Trading212 Portfolio menu not appearing"
- **Solution**: Refresh your Google Sheet (close and reopen)
- **Solution**: Check that all code files are properly saved in Apps Script
- **Solution**: Run the `onOpen()` function manually from Apps Script editor

### Need More Help?

- **Check the Issues** - Browse [existing issues](https://github.com/niklas-joh/portfolio_tracker_google_sheets/issues) for solutions
- **Report a Bug** - [Create a new issue](https://github.com/niklas-joh/portfolio_tracker_google_sheets/issues/new) with details
- **Read the Code** - Check the inline documentation in the source files

## 🔐 Privacy & Security

- Your API key is stored securely in your Google account's user properties
- No data is sent to third parties - only between Trading212 and your Google Sheet
- All code is open source and can be audited
- You can revoke API access at any time through Trading212

## 🤝 Contributing

We welcome contributions! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup instructions
- Code architecture overview
- Contribution guidelines
- Testing procedures

## 📝 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Trading212](https://www.trading212.com/) for providing the API
- The open-source community for inspiration and tools
- All contributors who help improve this project

## ⚠️ Disclaimer

This is an unofficial tool and is not affiliated with, endorsed by, or connected to Trading212. Use at your own risk. The developers are not responsible for any financial losses or data issues that may occur from using this tool.

Always verify critical data directly with Trading212's official platforms.

---

**Made with ❤️ for the Trading212 community**

Found this useful? Give it a ⭐ on [GitHub](https://github.com/niklas-joh/portfolio_tracker_google_sheets)!
