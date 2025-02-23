import csv
import re
import pandas as pd

file_path = "1.csv"

# **手動讀取 CSV，確保 `回覆備註` 欄位不拆行**
with open(file_path, "r", encoding="utf-8") as f:
    reader = csv.reader(f, skipinitialspace=True)  # 確保不會拆行
    rows = list(reader)

# **解析標題**
headers = [h.strip() for h in rows[0]]  # 清除空格
data = []

# **確保 "回覆備註" 是正確的欄位**
if "回覆備註" not in headers:
    raise KeyError(f"❌ 找不到 '回覆備註' 欄位，當前 CSV 欄位名稱: {headers}")

remarks_index = headers.index("回覆備註")  # 找到 "回覆備註" 的索引

# **處理數據**
for row in rows[1:]:
    while len(row) < len(headers):  # **確保所有欄位長度一致**
        row.append("")  # 補齊缺少的值，避免 IndexError

    row_data = dict(zip(headers, row))  # **轉為字典結構**
    raw_remarks = row[remarks_index]  # 取得回覆備註內容

    def split_remarks(text):
        if not text or text.strip() == "":
            return []
        text = text.strip().strip('"')

        # **確保 `\n` 不影響解析**
        remarks = re.findall(r'(\d{1,2}/\d{1,2}: .*?)(?=\d{1,2}/\d{1,2}:|$)', text, re.DOTALL)

        return [remark.strip() for remark in remarks]

    row_data["回覆備註"] = split_remarks(raw_remarks)  # **解析回覆備註**
    data.append(row_data)

# **轉為 DataFrame**
df = pd.DataFrame(data)

# **輸出結果**
print(df["回覆備註"])
print(df["回覆備註"][0])  # 確保解析成功
