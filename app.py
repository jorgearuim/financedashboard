import pandas as pd
import seaborn as sns
import plotly.express as px

sheet_id = "1_i6cdKgsL0xt6qEXkw0TSe7ZqtMLTJ-lsW3fJ9BlKBI"
sheet_name = "WealthSummary"
url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={sheet_name}"

table = pd.read_csv(url)

columns = {'Date', 'Asset', 'Liability', 'Equity', 'Equity - Cash', 'Total Equity',
       'Liquidity %', 'Savings', 'Holidays', 'Mortgage', 'Credit Card',
       'Target', 'Left', 'Money In', 'Return', 'Return Cumulative'}

table = table[columns]
table = table.fillna(0)

final_table = table.melt(id_vars=["Date"],
        var_name="category",
        value_name="amount")

columns_bar = {'Savings', 'Equity - Cash' , 'Equity' , 'Holidays'}


fig = px.bar(final_table[final_table['category'].isin(columns_bar)], x='Date', y='amount', color = 'category')
fig.update_layout(paper_bgcolor="white")



