# Time-Weighted Return (TWR) Formula Templates

**Implementation Guide for Portfolio Tracker Returns Dashboard**

---

## 📋 Overview

This document provides ready-to-use Google Sheets formula templates for calculating Time-Weighted Returns (TWR) using the Modified Dietz method. These formulas leverage existing infrastructure and are designed for transparent, maintainable calculations.

---

## 🏗️ Sheet Structure

### Required Sheets

You'll create two new sheets in your workbook:

1. **Daily_Portfolio_Values** - Calculates daily portfolio values
2. **Returns_Dashboard** - Displays TWR calculations for various periods

### Existing Dependencies

These sheets must exist (already implemented):
- `Historical_shares` - Daily share ownership per ticker
- `Portfolio` - Current positions with live prices
- `212Transactions` - Deposit/withdrawal history
- `AccountCash` - Current cash balance

---

## 📊 Sheet 1: Daily_Portfolio_Values

### Purpose
Calculate the total portfolio value for each day, combining:
- Market value of all positions (shares × prices)
- Cash balance

### Sheet Structure

**Columns:**
```
A: Date
B: Shares_Market_Value
C: Cash_Balance
D: Total_Portfolio_Value
E: Daily_Net_Cash_Flow
```

### Setup Instructions

#### Column A: Date (Last 365 Days)

**Cell A1:** `Date`

**Cell A2:**
```
=TODAY()-365
```

**Cell A3:**
```
=A2+1
```

Then drag down to A366 (or use ARRAYFORMULA):

**Alternative A2 (ARRAYFORMULA):**
```
=ARRAYFORMULA(TODAY()-SEQUENCE(365,1,365,1))
```

---

#### Column B: Shares Market Value

**Cell B1:** `Shares_Market_Value`

**Cell B2 - Basic Approach:**

This formula calculates the market value of all shares owned on that date. The challenge is we need to:
1. Get shares owned per ticker from Historical_shares for that date
2. Multiply by current price (or average price paid for historical estimates)

**Method 1: Using Average Price Paid (Historical Estimation)**

```
=SUMPRODUCT(
  (Historical_shares!$A$2:$A$1000=$A2)*1,
  Historical_shares!B$2:Z$2,
  Historical_avg_price_paid!B$2:Z$2
)
```

**Explanation:**
- `(Historical_shares!$A$2:$A$1000=$A2)*1` - Finds the row matching this date
- `Historical_shares!B$2:Z$2` - Shares owned per ticker (adjust range for your tickers)
- `Historical_avg_price_paid!B$2:Z$2` - Average price paid per ticker
- SUMPRODUCT multiplies shares × avg_price for each ticker and sums

**Method 2: Using Current Prices (Only for Today)**

For the most recent date only (TODAY()), use actual current prices from Portfolio:

```
=IF(
  $A2=TODAY(),
  SUMIF(Portfolio!$A:$A, ">0", Portfolio!$C:$C * Portfolio!$B:$B),
  SUMPRODUCT((Historical_shares!$A$2:$A$1000=$A2)*1, Historical_shares!B$2:Z$2, Historical_avg_price_paid!B$2:Z$2)
)
```

**Where Portfolio columns are:**
- Column A: ticker
- Column B: quantity
- Column C: currentPrice

---

#### Column C: Cash Balance

**Cell C1:** `Cash_Balance`

**Cell C2:**

This requires calculating cash balance at each historical date by:
1. Starting with current cash
2. Subtracting/adding transactions that occurred after this date

**Simple Approach (Current Cash Only):**
```
=IF($A2=TODAY(), AccountCash!B2, "")
```

**Full Historical Approach:**
```
=AccountCash!B2 + SUMIFS(
  212Transactions!$B:$B,
  212Transactions!$D:$D,
  ">"&$A2,
  212Transactions!$A:$A,
  "DEPOSIT"
) - SUMIFS(
  212Transactions!$B:$B,
  212Transactions!$D:$D,
  ">"&$A2,
  212Transactions!$A:$A,
  "WITHDRAW"
)
```

**Explanation:**
- Start with current cash balance
- Add back deposits made after this date
- Add back withdrawals made after this date (they reduced cash, so add back)
- This reconstructs historical cash balance

**Note:** Adjust column references based on your 212Transactions structure:
- Column A: type (DEPOSIT/WITHDRAW)
- Column B: amount
- Column D: dateTime

---

#### Column D: Total Portfolio Value

**Cell D1:** `Total_Portfolio_Value`

**Cell D2:**
```
=B2+C2
```

**Or with error handling:**
```
=IFERROR(B2,0)+IFERROR(C2,0)
```

---

#### Column E: Daily Net Cash Flow

**Cell E1:** `Daily_Net_Cash_Flow`

**Cell E2:**

This calculates net deposits minus withdrawals for each specific date:

```
=SUMIFS(
  212Transactions!$B:$B,
  212Transactions!$D:$D,
  "="&TEXT($A2,"YYYY-MM-DD"),
  212Transactions!$A:$A,
  "DEPOSIT"
) - SUMIFS(
  212Transactions!$B:$B,
  212Transactions!$D:$D,
  "="&TEXT($A2,"YYYY-MM-DD"),
  212Transactions!$A:$A,
  "WITHDRAW"
)
```

**Alternative (if your dateTime includes time):**
```
=SUMIFS(
  212Transactions!$B:$B,
  212Transactions!$D:$D,
  ">="&$A2,
  212Transactions!$D:$D,
  "<"&($A2+1),
  212Transactions!$A:$A,
  "DEPOSIT"
) - SUMIFS(
  212Transactions!$B:$B,
  212Transactions!$D:$D,
  ">="&$A2,
  212Transactions!$D:$D,
  "<"&($A2+1),
  212Transactions!$A:$A,
  "WITHDRAW"
)
```

---

## 📈 Sheet 2: Returns_Dashboard

### Purpose
Calculate and display Time-Weighted Returns for various periods using the Modified Dietz method.

### Modified Dietz Formula

```
Return = (Ending Value - Beginning Value - Net Cash Flows) / (Beginning Value + Weighted Cash Flows)

Where:
Weighted Cash Flows = Σ(Cash Flow × Days Remaining / Total Days)
```

### Sheet Structure

**Layout:**
```
     A                    B          C              D            E                   F
1  Period             Return     Start Value    End Value    Net Cash Flow    Days in Period
2  Today              [formula]   [formula]      [formula]    [formula]        1
3  Last 7 Days        [formula]   [formula]      [formula]    [formula]        7
4  Last 30 Days       [formula]   [formula]      [formula]    [formula]        30
5  Year to Date       [formula]   [formula]      [formula]    [formula]        [formula]
6  All Time           [formula]   [formula]      [formula]    [formula]        [formula]
```

---

### Column Setup

#### Column A: Period Labels

```
A1: Period
A2: Today
A3: Last 7 Days
A4: Last 30 Days
A5: Year to Date
A6: All Time
```

---

#### Column C: Start Value

**Cell C1:** `Start Value`

**Cell C2 (Today):**
```
=VLOOKUP(TODAY()-1, Daily_Portfolio_Values!A:D, 4, FALSE)
```

**Cell C3 (Last 7 Days):**
```
=VLOOKUP(TODAY()-7, Daily_Portfolio_Values!A:D, 4, FALSE)
```

**Cell C4 (Last 30 Days):**
```
=VLOOKUP(TODAY()-30, Daily_Portfolio_Values!A:D, 4, FALSE)
```

**Cell C5 (Year to Date):**
```
=VLOOKUP(DATE(YEAR(TODAY()),1,1)-1, Daily_Portfolio_Values!A:D, 4, FALSE)
```

**Cell C6 (All Time):**
```
=INDEX(Daily_Portfolio_Values!D:D, 
  MATCH(TRUE, Daily_Portfolio_Values!D:D>0, 0))
```

---

#### Column D: End Value

**Cell D1:** `End Value`

**Cell D2-D6 (All periods):**
```
=VLOOKUP(TODAY(), Daily_Portfolio_Values!A:D, 4, FALSE)
```

---

#### Column E: Net Cash Flow

**Cell E1:** `Net Cash Flow`

**Cell E2 (Today):**
```
=SUMIFS(Daily_Portfolio_Values!$E:$E, 
  Daily_Portfolio_Values!$A:$A, "="&TODAY())
```

**Cell E3 (Last 7 Days):**
```
=SUMIFS(Daily_Portfolio_Values!$E:$E,
  Daily_Portfolio_Values!$A:$A, ">="&(TODAY()-7),
  Daily_Portfolio_Values!$A:$A, "<="&TODAY())
```

**Cell E4 (Last 30 Days):**
```
=SUMIFS(Daily_Portfolio_Values!$E:$E,
  Daily_Portfolio_Values!$A:$A, ">="&(TODAY()-30),
  Daily_Portfolio_Values!$A:$A, "<="&TODAY())
```

**Cell E5 (Year to Date):**
```
=SUMIFS(Daily_Portfolio_Values!$E:$E,
  Daily_Portfolio_Values!$A:$A, ">="&DATE(YEAR(TODAY()),1,1),
  Daily_Portfolio_Values!$A:$A, "<="&TODAY())
```

**Cell E6 (All Time):**
```
=SUM(Daily_Portfolio_Values!E:E)
```

---

#### Column F: Days in Period

**Cell F1:** `Days in Period`

**Cell F2:** `1`

**Cell F3:** `7`

**Cell F4:** `30`

**Cell F5:**
```
=TODAY()-DATE(YEAR(TODAY()),1,1)+1
```

**Cell F6:**
```
=TODAY()-INDEX(Daily_Portfolio_Values!A:A, 
  MATCH(TRUE, Daily_Portfolio_Values!D:D>0, 0))+1
```

---

#### Column B: Return (Modified Dietz)

**Cell B1:** `Return`

**Simplified Formula (No Cash Flow Weighting):**

For periods with minimal cash flows, use this simpler formula:

**Cell B2-B6:**
```
=(D2-C2-E2)/C2
```

Format as percentage (Format → Number → Percent)

---

**Full Modified Dietz Formula (With Cash Flow Weighting):**

For more accuracy with frequent cash flows:

**Cell B2-B6:**
```
=(D2-C2-E2)/(C2+G2)
```

Where Column G calculates Weighted Cash Flows (see below).

---

### Column G: Weighted Cash Flows (Advanced)

**Cell G1:** `Weighted Cash Flow`

This is the complex part - we need to weight each cash flow by how long it was invested.

**Cell G2 (Today):**
```
=0
```
(No weighting needed for single day)

**Cell G3-G6:**
```
=SUMPRODUCT(
  (Daily_Portfolio_Values!$A:$A >= (TODAY()-F3)) *
  (Daily_Portfolio_Values!$A:$A <= TODAY()) *
  Daily_Portfolio_Values!$E:$E *
  ((TODAY() - Daily_Portfolio_Values!$A:$A) / F3)
)
```

**Explanation:**
- Filter dates within the period
- Multiply each cash flow by its weight (days remaining / total days)
- Sum all weighted cash flows

**Simplified Alternative (80% Accuracy):**

If the full formula is too complex, use a midpoint approximation:

**Cell G3-G6:**
```
=E3*0.5
```

This assumes all cash flows occur at the midpoint of the period (50% weight on average).

---

## 🎨 Formatting Recommendations

### Returns_Dashboard Sheet

**Column B (Return):**
- Format: Percentage
- Decimal places: 2
- Conditional formatting:
  - Green if > 0
  - Red if < 0
  - Gray if = 0

**Columns C, D, E (Values):**
- Format: Currency
- Symbol: € (or your currency)
- Decimal places: 2

**Column F (Days):**
- Format: Number
- Decimal places: 0

---

## 🔧 Troubleshooting

### Common Issues

**1. #N/A Error in Start Value**
- **Cause:** No data for that date in Daily_Portfolio_Values
- **Fix:** Ensure Daily_Portfolio_Values has sufficient historical data

**2. #DIV/0! Error in Return**
- **Cause:** Start value is zero
- **Fix:** Add error handling:
  ```
  =IFERROR((D2-C2-E2)/C2, "N/A")
  ```

**3. Incorrect Historical Values**
- **Cause:** Using average price paid instead of actual historical prices
- **Note:** This is expected limitation. For 100% accuracy, need daily price snapshots (future enhancement)

**4. Cash Flow Dates Don't Match**
- **Cause:** Date format mismatch between sheets
- **Fix:** Ensure all dates use same format (YYYY-MM-DD recommended)

---

## ✅ Validation Steps

### 1. Check Today's Values

Compare:
- `Daily_Portfolio_Values!D2` (today's total value)
- Sum of Portfolio sheet market values + AccountCash balance

Should match exactly.

### 2. Verify Cash Flows

Check:
- `Daily_Portfolio_Values!E:E` sum
- Against 212Transactions total deposits minus withdrawals

Should match exactly.

### 3. Test Return Calculations

For today (should be small):
```
Return ≈ (Today's Value - Yesterday's Value) / Yesterday's Value
```

### 4. Sanity Check

- Year-to-date return should be larger than monthly
- All-time return should be largest
- Returns should be reasonable (-50% to +100% typically)

---

## 📊 Example Values

**Sample Returns_Dashboard:**

```
Period          | Return   | Start Value | End Value | Net Cash Flow | Days
----------------|----------|-------------|-----------|---------------|------
Today           | +0.43%   | €10,234.50  | €10,278.45| €0.00         | 1
Last 7 Days     | +2.15%   | €10,015.20  | €10,278.45| €50.00        | 7
Last 30 Days    | +5.72%   | €9,850.30   | €10,278.45| €150.00       | 30
Year to Date    | +12.34%  | €9,150.75   | €10,278.45| €500.00       | 345
All Time        | +27.84%  | €8,040.00   | €10,278.45| €1,850.00     | 487
```

---

## 🚀 Quick Start Checklist

- [ ] 1. Create `Daily_Portfolio_Values` sheet
- [ ] 2. Set up Date column (A) with last 365 days
- [ ] 3. Add Shares_Market_Value formula (B) - adjust ticker range
- [ ] 4. Add Cash_Balance formula (C) - verify transaction columns
- [ ] 5. Add Total_Portfolio_Value formula (D)
- [ ] 6. Add Daily_Net_Cash_Flow formula (E)
- [ ] 7. Create `Returns_Dashboard` sheet
- [ ] 8. Add period labels (A)
- [ ] 9. Add Start Value formulas (C)
- [ ] 10. Add End Value formulas (D)
- [ ] 11. Add Net Cash Flow formulas (E)
- [ ] 12. Add Days in Period formulas (F)
- [ ] 13. Add Return formulas (B) - start with simplified version
- [ ] 14. Format columns (percentage, currency)
- [ ] 15. Add conditional formatting for returns
- [ ] 16. Validate against known values
- [ ] 17. Test with portfolio refresh

---

## 🔮 Future Enhancements

### Already Planned:
- **Historical Price Snapshots**: Replace average price paid with actual historical prices
- **Per-Pie Returns**: Calculate TWR for individual pies (requires Apps Script)
- **Benchmarking**: Compare returns against S&P 500, etc.
- **Charts**: Visual representation of returns over time

### Formula Upgrades:
- True TWR (chain method) instead of Modified Dietz
- Risk metrics (Sharpe ratio, volatility)
- Drawdown analysis
- Contribution analysis (which positions drove returns)

---

## 📚 References

### Modified Dietz Method
- [CFA Institute - Time-Weighted Return](https://www.cfainstitute.org/en/membership/professional-development/refresher-readings/return-calculation)
- [Investopedia - Modified Dietz](https://www.investopedia.com/terms/m/modified-dietz-method.asp)

### Google Sheets Functions
- [SUMPRODUCT](https://support.google.com/docs/answer/3094294)
- [SUMIFS](https://support.google.com/docs/answer/3238496)
- [VLOOKUP](https://support.google.com/docs/answer/3093318)
- [ARRAYFORMULA](https://support.google.com/docs/answer/3093275)

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-10  
**Maintained By:** Development Team  
**Next Review:** After user testing and feedback
