# Unit economics: Kampus Kita (Jual Beli USU Polmed)

Every number below comes from the input file. Nothing is looked up or guessed.

## One paid listing package

| line | per paid listing package |
| --- | ---: |
| Price | $12,000.00 |
| QRIS payment gateway fee (0.7%) | -$84.00 |
| Azure VPS & Supabase marginal compute | -$150.00 |
| WhatsApp delivery buffer & network | -$200.00 |
| Guarantee & refund reserve (2%) | -$240.00 |
| **Contribution** (what each paid listing package leaves to pay the fixed costs) | **$11,326.00** (94%) |

## The margin that matters

Fixed costs: $1,155,000 a month (Azure Linux VPS (PM2 worker) $250,000, Supabase PostgreSQL Database $380,000, Domain kampuskita.my.id & SSL $25,000, Part-time student moderator stipend $500,000).

- **Break-even: 4 paid listing packages a day.** Below that you lose money every month.
- **Profit margin at your plan** (15 a day): **73%** of every sale, after every cost.
- Capacity: 100 a day.

## Year 1, month by month

| month | paid listing packages a day | revenue | profit | cumulative (after $1,450,000 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 3 | $1,080,000 | -$135,660 | -$1,585,660 |
| 2 | 5 | $1,800,000 | $543,900 | -$1,041,760 |
| 3 | 8 | $2,880,000 | $1,563,240 | $521,480 |
| 4 | 12 | $4,320,000 | $2,922,360 | $3,443,840 |
| 5 | 15 | $5,400,000 | $3,941,700 | $7,385,540 |
| 6 | 18 | $6,480,000 | $4,961,040 | $12,346,580 |
| 7 | 22 | $7,920,000 | $6,320,160 | $18,666,740 |
| 8 | 25 | $9,000,000 | $7,339,500 | $26,006,240 |
| 9 | 28 | $10,080,000 | $8,358,840 | $34,365,080 |
| 10 | 30 | $10,800,000 | $9,038,400 | $43,403,480 |
| 11 | 32 | $11,520,000 | $9,717,960 | $53,121,440 |
| 12 | 35 | $12,600,000 | $10,737,300 | $63,858,740 |

- **Year 1 operating profit: $65,308,740** on $83,880,000 of revenue.
- After the $1,450,000 startup spend: $63,858,740.
- Startup money earned back: month 3.
- Cash you need before it pays for itself: **$1,585,660**.

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 73% | 4 | $65,308,740 |
| Price -10% | 70% | 4 | $56,920,740 |
| Volume -20% | 68% | 4 | $49,474,992 |
| Unit costs +15% | 72% | 4 | $64,602,051 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.
