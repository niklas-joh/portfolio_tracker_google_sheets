# Returns Dashboard Visual Guide

**Visual Reference for Implementing TWR Calculations**

---

## 📊 What You're Building

This guide shows you exactly what your two new sheets should look like after implementing the formulas from `TWR_Formula_Templates.md`.

---

## Sheet 1: Daily_Portfolio_Values

### Visual Layout

```
┌─────────────┬──────────────────────┬──────────────┬────────────────────────┬──────────────────────┐
│      A      │          B           │      C       │           D            │          E           │
├─────────────┼──────────────────────┼──────────────┼────────────────────────┼──────────────────────┤
│    Date     │ Shares_Market_Value  │ Cash_Balance │ Total_Portfolio_Value  │ Daily_Net_Cash_Flow  │
├─────────────┼──────────────────────┼──────────────┼────────────────────────┼──────────────────────┤
│ 2024-01-01  │      €8,234.50       │   €500.00    │       €8,734.50        │       €0.00          │
│ 2024-01-02  │      €8,312.20       │   €500.00    │       €8,812.20        │       €0.00          │
│ 2024-01-03  │      €8,298.75       │   €500.00    │       €8,798.75        │       €0.00          │
│ 2024-01-04  │      €8,405.30       │   €500.00    │       €8,905.30        │       €0.00          │
│ 2024-01-05  │      €8,450.10       │   €650.00    │       €9,100.10        │     €150.00          │
│ 2024-01-06  │      €8,523.45       │   €650.00    │       €9,173.45        │       €0.00          │
│     ...     │         ...          │     ...      │          ...           │        ...           │
│ 2024-12-10  │     €10,128.45       │   €650.00    │      €10,778.45        │       €0.00          │
└─────────────┴──────────────────────┴──────────────┴────────────────────────┴──────────────────────┘
```

### What Each Column Does

**Column A - Date:**
- Shows dates from 365 days ago to today
- Auto-generated with formula
- Automatically updates each day

**Column B - Shares Market Value:**
- Total value of all stock positions
- For historical dates: uses shares × average price paid (estimation)
- For today: uses shares × current live price (accurate)

**Column C - Cash Balance:**
- Cash in your account on that date
- Reconstructed by working backwards from current cash
- Accounts for all deposits/withdrawals

**Column D - Total Portfolio Value:**
- Simply B + C
- This is your total wealth on that date
- Used for return calculations

**Column E - Daily Net Cash Flow:**
- Net deposits minus withdrawals on that specific date
- €0 for most days (no activity)
- Positive when you deposit, negative when you withdraw
- Critical for accurate TWR calculation

---

## Sheet 2: Returns_Dashboard

### Visual Layout

```
┌──────────────────┬──────────┬──────────────┬──────────────┬─────────────────┬─────────────────┐
│        A         │    B     │      C       │      D       │        E        │        F        │
├──────────────────┼──────────┼──────────────┼──────────────┼─────────────────┼─────────────────┤
│     Period       │  Return  │ Start Value  │  End Value   │ Net Cash Flow   │ Days in Period  │
├──────────────────┼──────────┼──────────────┼──────────────┼─────────────────┼─────────────────┤
│     Today        │  +0.43%  │  €10,234.50  │ €10,278.45   │     €0.00       │        1        │
│   Last 7 Days    │  +2.15%  │  €10,015.20  │ €10,278.45   │    €50.00       │        7        │
│  Last 30 Days    │  +5.72%  │   €9,850.30  │ €10,278.45   │   €150.00       │       30        │
│  Year to Date    │ +12.34%  │   €9,150.75  │ €10,278.45   │   €500.00       │      345        │
│    All Time      │ +27.84%  │   €8,040.00  │ €10,278.45   │  €1,850.00      │      487        │
└──────────────────┴──────────┴──────────────┴──────────────┴─────────────────┴─────────────────┘
```

### With Recommended Formatting

**After applying formatting (colors & styles):**

```
┌──────────────────┬──────────┬──────────────┬──────────────┬─────────────────┬─────────────────┐
│     Period       │  Return  │ Start Value  │  End Value   │ Net Cash Flow   │ Days in Period  │
│  (Bold Header)   │(% Green) │  (Currency)  │  (Currency)  │   (Currency)    │    (Number)     │
├──────────────────┼──────────┼──────────────┼──────────────┼─────────────────┼─────────────────┤
│     Today        │  +0.43%  │  €10,234.50  │ €10,278.45   │     €0.00       │        1        │
│                  │  🟢      │              │              │                 │                 │
├──────────────────┼──────────┼──────────────┼──────────────┼─────────────────┼─────────────────┤
│   Last 7 Days    │  +2.15%  │  €10,015.20  │ €10,278.45   │    €50.00       │        7        │
│                  │  🟢      │              │              │                 │                 │
├──────────────────┼──────────┼──────────────┼──────────────┼─────────────────┼─────────────────┤
│  Last 30 Days    │  +5.72%  │   €9,850.30  │ €10,278.45   │   €150.00       │       30        │
│                  │  🟢      │              │              │                 │                 │
├──────────────────┼──────────┼──────────────┼──────────────┼─────────────────┼─────────────────┤
│  Year to Date    │ +12.34%  │   €9,150.75  │ €10,278.45   │   €500.00       │      345        │
│                  │  🟢      │              │              │                 │                 │
├──────────────────┼──────────┼──────────────┼──────────────┼─────────────────┼─────────────────┤
│    All Time      │ +27.84%  │   €8,040.00  │ €10,278.45   │  €1,850.00      │      487        │
│                  │  🟢      │              │              │                 │                 │
└──────────────────┴──────────┴──────────────┴──────────────┴─────────────────┴─────────────────┘
```

### What Each Column Shows

**Column A - Period:**
- Simple text labels
- These are the time periods you're analyzing

**Column B - Return (%):**
- The TIME-WEIGHTED RETURN (TWR) for that period
- Shows how well your investments performed
- Excludes the impact of deposits/withdrawals
- Green if positive, red if negative

**Column C - Start Value:**
- Your total portfolio value at the start of the period
- Pulled from Daily_Portfolio_Values sheet

**Column D - End Value:**
- Your total portfolio value today (end of period)
- Always shows today's value for all periods

**Column E - Net Cash Flow:**
- Total deposits minus withdrawals during the period
- Shows how much money you added/removed
- Separated from returns so you see pure performance

**Column F - Days in Period:**
- How many days are in this calculation
- Used internally for weighted cash flows

---

## 🎯 Reading Your Returns

### Example Interpretation

Let's say your Returns_Dashboard shows:

```
Last 30 Days: +5.72%
Start Value: €9,850.30
End Value: €10,278.45
Net Cash Flow: €150.00
```

**What this means:**

1. **30 days ago**, your portfolio was worth **€9,850.30**
2. **Today**, your portfolio is worth **€10,278.45**
3. **During this period**, you deposited **€150.00**
4. **Your investment return** was **+5.72%**

**Breaking it down:**

- Total change: €10,278.45 - €9,850.30 = **€428.15**
- You deposited: **€150.00**
- Investment gain: €428.15 - €150.00 = **€278.15**
- Return: €278.15 / €9,850.30 = **2.82%** (simplified)
- Actual TWR: **5.72%** (accounts for timing of deposit)

**Key Insight:**

Without TWR calculation, you might think:
- "My portfolio grew by €428.15, which is 4.35%"
- But €150 of that was money YOU added, not investment returns

TWR correctly shows:
- "Your **investments** returned **5.72%**"
- Separates your contributions from investment performance

---

## 🔄 How Data Flows

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TRADING212 API                                 │
│  (Fetched via Portfolio Tracker menu items)                         │
└────────────┬────────────────────────────┬───────────────────────────┘
             │                            │
             ▼                            ▼
    ┌─────────────────┐         ┌──────────────────┐
    │   Portfolio     │         │ 212Transactions  │
    │  (live prices)  │         │ (deposits/       │
    │                 │         │  withdrawals)    │
    └────────┬────────┘         └────────┬─────────┘
             │                           │
             │                           │
             ▼                           ▼
    ┌──────────────────────────────────────────────┐
    │        Historical_shares (existing)          │
    │        Historical_avg_price_paid (existing)  │
    │        AccountCash (existing)                │
    └────────────────────┬─────────────────────────┘
                         │
                         │ All data feeds into
                         ▼
            ┌─────────────────────────┐
            │ Daily_Portfolio_Values  │ ◄─── You create this
            │  (calculates values     │
            │   for each day)         │
            └────────────┬────────────┘
                         │
                         │ Values feed into
                         ▼
            ┌─────────────────────────┐
            │   Returns_Dashboard     │ ◄─── You create this
            │  (calculates TWR for    │
            │   each period)          │
            └─────────────────────────┘
```

---

## 🎨 Conditional Formatting Setup

### For Column B (Return) in Returns_Dashboard

**Positive Returns (Green):**
```
Format → Conditional formatting
Format cells if... : Greater than 0
Formatting style: Light green background, dark green text
```

**Negative Returns (Red):**
```
Format → Conditional formatting
Format cells if... : Less than 0
Formatting style: Light red background, dark red text
```

**Zero Returns (Gray):**
```
Format → Conditional formatting
Format cells if... : Equal to 0
Formatting style: Light gray background, dark gray text
```

### Visual Result

```
┌──────────────────┬──────────┐
│     Period       │  Return  │
├──────────────────┼──────────┤
│     Today        │  +0.43%  │  ← Green (positive)
├──────────────────┼──────────┤
│   Last 7 Days    │  +2.15%  │  ← Green (positive)
├──────────────────┼──────────┤
│  Last 30 Days    │  -1.23%  │  ← Red (negative)
├──────────────────┼──────────┤
│  Year to Date    │  +12.34% │  ← Green (positive)
├──────────────────┼──────────┤
│    All Time      │   0.00%  │  ← Gray (zero)
└──────────────────┴──────────┘
```

---

## ✅ Validation Checklist

After building your sheets, verify these:

### Daily_Portfolio_Values Validation

- [ ] **Column A** shows today's date in the first row
- [ ] **Column A** shows dates going back 365 days
- [ ] **Column B** shows positive numbers (market values)
- [ ] **Column C** shows your current cash for today's row
- [ ] **Column D** = Column B + Column C (check a few rows)
- [ ] **Column E** shows €0 for most days (unless you deposited/withdrew)
- [ ] **Column E** sum matches your total lifetime deposits minus withdrawals

### Returns_Dashboard Validation

- [ ] **Today's return** is a small number (typically -2% to +2%)
- [ ] **Returns increase** as period lengthens (usually)
- [ ] **End Value** is the same for all rows (today's portfolio value)
- [ ] **Start Value** decreases as period lengthens (portfolio was smaller in past)
- [ ] **Net Cash Flow** increases as period lengthens (more transactions over time)
- [ ] **Column B** formatted as percentage (%)
- [ ] **Columns C, D, E** formatted as currency (€)

---

## 🚨 Common Mistakes to Avoid

### Mistake 1: Wrong Column References

**Problem:**
```
=SUMPRODUCT(Historical_shares!B$2:Z$2, ...)
                           ^^^ Wrong row
```

**Solution:**
- Check your Historical_shares sheet to see which row has ticker names
- Adjust the range to match YOUR sheet structure

---

### Mistake 2: Date Format Mismatches

**Problem:**
- Daily_Portfolio_Values shows dates as "01/01/2024"
- 212Transactions has dates as "2024-01-01 14:30:00"
- VLOOKUP fails to find matches

**Solution:**
- Use TEXT() function to standardize dates
- Or use >= and < comparisons instead of exact matches

---

### Mistake 3: Forgetting to Format as Percentage

**Problem:**
```
Return column shows: 0.0572
Instead of: 5.72%
```

**Solution:**
- Select column B in Returns_Dashboard
- Format → Number → Percent
- Set to 2 decimal places

---

### Mistake 4: Including Cash in Shares Market Value

**Problem:**
- Counting cash balance in Column B
- Then adding it again in Column D
- Results in double-counting cash

**Solution:**
- Column B = ONLY stock positions (shares × prices)
- Column C = ONLY cash
- Column D = B + C (combined total)

---

## 📱 Mobile View Considerations

If you access Google Sheets on mobile:

**Recommended Setup:**
- Freeze first row (headers)
- Freeze first column (labels)
- Hide Daily_Portfolio_Values sheet (show only Returns_Dashboard)
- Set column widths to fit mobile screen

**To Freeze:**
1. Click on cell B2
2. View → Freeze → Up to row 1
3. View → Freeze → Up to column A

---

## 🎓 Understanding Time-Weighted Return

### Why Not Just: (End - Start) / Start?

**Simple Return:**
```
(€10,278.45 - €9,850.30) / €9,850.30 = 4.35%
```

**Problem:**
- Doesn't account for the €150 you deposited
- Makes your performance look worse than it is
- If you deposited at the beginning vs. end of period, results differ

**Time-Weighted Return:**
```
TWR = +5.72%
```

**Benefit:**
- Removes impact of your deposit timing
- Shows true investment performance
- Fair comparison across different time periods
- Industry standard for evaluating portfolio managers

### When TWR Really Matters

**Scenario:**
- January 1: Portfolio = €10,000
- June 15: You deposit €5,000 (terrible timing, market crashes next day)
- December 31: Portfolio = €14,000

**Simple Return:**
```
(€14,000 - €10,000) / €10,000 = +40%
"Wow, I'm amazing!"
```

**Reality Check:**
- You added €5,000 yourself
- Investment only gained €14,000 - €10,000 - €5,000 = -€1,000
- You actually LOST money on your investments!

**TWR:**
```
TWR = -6.7%
"My investments lost money this year"
```

This is why TWR is critical for honest performance tracking.

---

## 📈 Next Steps After Implementation

Once your dashboard is working:

1. **Daily**: Check your dashboard after market close
2. **Weekly**: Review 7-day returns, look for trends
3. **Monthly**: Compare to benchmarks (S&P 500, etc.)
4. **Quarterly**: Analyze what drove returns (winners/losers)
5. **Yearly**: Tax planning, rebalancing decisions

---

## 🔗 Related Documentation

- **Full Formula Details**: See `TWR_Formula_Templates.md`
- **Future Enhancements**: See `future_implementation_considerations.md`
- **API Documentation**: See main `README.md`

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-10  
**Maintained By:** Development Team
