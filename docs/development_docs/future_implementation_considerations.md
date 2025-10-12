# Future Implementation Considerations

This document tracks future enhancements and implementation considerations for the Trading212 Portfolio Tracker.

## 📊 Returns Calculation Implementation

### Phase 1: Formula-Based Total Portfolio Returns ✅ (In Progress)

**Status**: Active Development

**Objective**: Calculate daily, weekly, monthly, and yearly Time-Weighted Returns (TWR) for the total portfolio using Google Sheets formulas.

**Components**:
1. ✅ Add Portfolio endpoint (`/api/v0/equity/portfolio`) to fetch current positions and prices
2. ✅ Create fetchPortfolio() function following existing patterns
3. ✅ Add menu item for portfolio data fetching
4. ✅ Provide formula templates for TWR calculations (see `TWR_Formula_Templates.md`)
5. ✅ Create Returns dashboard sheet design (see `TWR_Formula_Templates.md`)

**Benefits**:
- Transparent calculations visible to end-users
- Automatic recalculation when data updates
- Minimal code complexity
- Leverages existing Historical_shares infrastructure

**Limitations**:
- Uses average price paid for historical values (estimation)
- Performance may degrade with very large datasets (>1000 rows)
- Limited to total portfolio returns only

---

### Phase 2: Script-Based Per-Pie Returns ⏳ (Future)

**Status**: Planned

**Objective**: Calculate accurate TWR for individual investment pies with proper cash flow allocation.

**Why Script-Based**:
- Complex logic required to allocate transactions to specific pies
- Pie membership changes over time
- Need to track multiple portfolios simultaneously
- Better performance with complex calculations
- More accurate than formula approximations

**Implementation Approach**:
1. Create new module: `calculations/pieReturnsCalculator.js`
2. Read pie history from Trading212 API
3. Allocate transactions to specific pies based on:
   - Transaction timestamps
   - Pie membership at time of transaction
   - Autoinvest allocations
4. Calculate TWR per pie using Modified Dietz or True TWR
5. Write results to pie-specific returns sheets

**Data Requirements**:
- Historical pie compositions over time
- Transaction history with pie attribution
- Cash flow events per pie
- Pie rebalancing events

**Challenges**:
- Pie membership changes need historical tracking
- Cash flows must be allocated proportionally
- Rebalancing events affect calculations
- API may not provide full historical pie data

**Dependencies**:
- Phase 1 must be complete and validated
- Need to verify API provides sufficient pie history
- May require storing daily pie snapshots

---

## 🔄 Performance Optimizations

### Historical Data Optimization

**Current Issue**: 
- `Historical_shares` and `Historical_avg_price_paid` sheets recalculate for ALL days on every update
- With 100 days × 50 tickers = 5,000 calculations per update
- Performance degrades as history grows

**Proposed Solutions**:

1. **Option A: Limit Calculation Range**
   - Only calculate last 30-90 days in formulas
   - Move older data to separate archive sheets
   - Reduce active calculation load by 70-90%

2. **Option B: Freeze Historical Data**
   - Convert formulas to values for dates older than 30 days
   - Keep only recent dates as live formulas
   - Scheduled script to freeze old data monthly

3. **Option C: Migrate to Apps Script**
   - Calculate once per day via script
   - Store results as values (no formulas)
   - Trigger-based updates instead of live calculations
   - Trade-off: not live, but much faster

**Recommendation**: Start with Option A (easiest), migrate to Option B if needed, reserve Option C for extreme cases.

---

## 📈 Price Data Enhancements

### Historical Price Tracking

**Current Limitation**:
- Portfolio endpoint only provides current prices
- Historical returns use average price paid (estimation)
- Cannot calculate exact historical portfolio values

**Proposed Solution**:
- Daily scheduled script to snapshot portfolio data
- Store daily prices in `Portfolio_History` sheet
- Accumulate historical price data over time
- Use actual historical prices for accurate TWR calculations

**Implementation**:
```javascript
// Pseudo-code
function dailyPortfolioSnapshot() {
  const portfolio = fetchPortfolio();
  const today = new Date();
  
  portfolio.forEach(position => {
    appendToSheet('Portfolio_History', {
      date: today,
      ticker: position.ticker,
      quantity: position.quantity,
      currentPrice: position.currentPrice,
      marketValue: position.quantity * position.currentPrice
    });
  });
}
```

**Benefits**:
- Accurate historical valuations
- True TWR calculations possible
- Portfolio value tracking over time
- Historical performance analysis

---

## 🗺️ Ticker Mapping System

### Google Finance Integration

**Challenge**:
Trading212 tickers (e.g., `AAPL_US_EQ`) don't map directly to Google Finance tickers (e.g., `NASDAQ:AAPL`).

**Proposed Solution**:

1. **Create Ticker Mapping Table**
   - Sheet: `Ticker_Mapping`
   - Columns: `Trading212_Ticker | GoogleFinance_Ticker | Exchange | Verified`
   - Manual one-time setup per unique ticker

2. **Auto-Mapping Function**
   - Parse Trading212 ticker format
   - Attempt automatic mapping based on patterns
   - Flag uncertain mappings for manual review

3. **GOOGLEFINANCE Integration**
   - Use mapped tickers to fetch real-time prices
   - Supplement Trading212 API data
   - Enable external price tracking

**Use Cases**:
- Real-time price updates outside trading hours
- Historical price data from Google Finance
- Cross-validation of Trading212 prices
- Extended market data (P/E ratios, etc.)

**Implementation Priority**: Low (Phase 1 doesn't require external prices)

---

## 🥧 Enhanced Pie Analytics

### Per-Pie Performance Tracking

**Future Features**:
1. Individual pie return calculations
2. Pie vs. benchmark comparison
3. Pie rebalancing impact analysis
4. Asset allocation drift tracking
5. Pie contribution to total returns

**Data Requirements**:
- Historical pie compositions
- Pie-specific cash flows
- Rebalancing event logs
- Benchmark data for comparison

---

## 🔔 Notification System

### Automated Alerts

**Potential Features**:
- Daily performance summaries via email
- Alert on significant portfolio changes (>5%)
- Dividend payment notifications
- Pie rebalancing alerts
- API connection issues warnings

**Implementation**:
- Use Google Apps Script MailApp service
- Configure user preferences in settings sheet
- Time-driven triggers for scheduled checks

---

## 📊 Advanced Reporting

### Visual Dashboards

**Future Enhancements**:
1. Google Charts integration for visual performance
2. Heatmaps for sector allocation
3. Timeline charts for portfolio growth
4. Comparison charts (pies, periods, benchmarks)

**Technical Considerations**:
- Google Sheets native charting capabilities
- Apps Script chart generation
- HTML service for custom visualizations
- Performance impact of complex charts

---

## 🔐 Security Enhancements

### API Key Management

**Future Improvements**:
1. Encrypted storage of API keys
2. Key rotation reminders
3. Separate keys for demo/live environments
4. Permission scoping (read-only vs. trading)

---

## 📝 Documentation Needs

### User Guides**
- Video tutorials for setup
- FAQ section expansion
- Troubleshooting flowcharts
- Example use cases and scenarios

### Developer Documentation
- API endpoint reference
- Function dependency map
- Architecture diagrams
- Testing framework documentation

---

## 🔄 Data Synchronization

### Incremental Updates

**Current**: Full data refresh on each fetch
**Proposed**: Incremental updates based on timestamps

**Benefits**:
- Faster updates
- Reduced API calls
- Lower rate limit impact
- Better user experience

**Implementation Considerations**:
- Track last sync timestamp per data type
- Use cursor-based pagination efficiently
- Handle data conflicts and corrections

---

## 📊 Export & Backup

### Data Portability

**Planned Features**:
1. Export portfolio data to CSV/JSON
2. Automated backup to Google Drive
3. Import historical data from external sources
4. Migration tools for switching accounts

---

## 🧪 Testing Infrastructure

### Automated Testing

**Future Development**:
1. Unit tests for calculation functions
2. Integration tests for API calls
3. Mock API responses for testing
4. Regression test suite
5. Performance benchmarking

**Framework Options**:
- Google Apps Script testing libraries
- Jest for local testing
- Custom test harness

---

## Priority Matrix

| Feature | Priority | Complexity | Impact |
|---------|----------|------------|--------|
| Phase 1: Total Portfolio TWR | 🔴 High | Medium | High |
| Historical Price Snapshots | 🟡 Medium | Low | Medium |
| Performance Optimization | 🟡 Medium | Medium | High |
| Phase 2: Per-Pie TWR | 🟢 Low | High | Medium |
| Ticker Mapping System | 🟢 Low | Medium | Low |
| Notification System | 🟢 Low | Low | Medium |
| Advanced Reporting | 🟢 Low | High | Medium |

---

**Last Updated**: 2025-12-10
**Maintained By**: Development Team
**Review Frequency**: After each major feature completion
