import csv
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import re

app = Flask(__name__)
CORS(app)

CSV_FILE = "data.csv"

def load_proposals_from_csv():
    # **手動讀取 CSV，確保 `回覆備註` 欄位內部的 `\n` 不影響解析**
    with open(CSV_FILE, "r", encoding="utf-8") as f:
        reader = csv.reader(f, skipinitialspace=True)
        rows = list(reader)

    # **解析標題**
    headers = [h.strip().replace("\r", "").replace("\n", "") for h in rows[0]]  # 清除空格與換行符
    data = []

    # **確保 "回覆備註" 欄位存在**
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
            """解析回覆備註，確保日期格式完整保留"""
            if not text or text.strip() == "":
                return []
            text = text.strip().strip('"')

            # **使用正則表達式拆分回覆備註**
            remarks = re.findall(r'(\d{1,2}/\d{1,2}: .*?)(?=\d{1,2}/\d{1,2}:|$)', text, re.DOTALL)

            return [remark.strip().replace("\n", "<br>") for remark in remarks]

        row_data["回覆備註"] = split_remarks(raw_remarks)  # **解析回覆備註**
        data.append(row_data)

    return data  # **回傳 JSON 格式的資料**


def save_proposals_to_csv(proposals):
    """ 將修改後的資料存回 CSV """
    if not proposals:
        return
    
    fieldnames = proposals[0].keys()
    with open(CSV_FILE, mode='w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(proposals)


@app.route('/api/proposals', methods=['GET'])
def get_proposals():
    proposals = load_proposals_from_csv()
    print(proposals)
    return jsonify(proposals)


@app.route('/api/proposals/<item_id>', methods=['PUT'])
def update_proposal(item_id):
    """ 更新指定 `總表項次` 的提案資料 """
    proposals = load_proposals_from_csv()
    updated_data = request.json

    found = False
    for proposal in proposals:
        if proposal["總表項次"] == item_id:  # 確認對應項次
            proposal.update(updated_data)  # 更新內容
            found = True
            break

    if not found:
        return jsonify({"error": "項次未找到"}), 404

    save_proposals_to_csv(proposals)  # 存回 CSV
    return jsonify({"message": "更新成功"}), 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)