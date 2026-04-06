#!/bin/bash
# 既存イベントのopening_hoursをバックフィルするスクリプト
# 使い方: bash scripts/backfill-opening-hours.sh

SECRET="9e9c228065583e07988cfdf03388d8baaf98e1dd37fbefe8c144b42b1be45a49"
URL="https://nazoevent-app.vercel.app/api/crawl/backfill-opening-hours?secret=${SECRET}"

total_updated=0
total_skipped=0
total_failed=0
round=0

echo "===== opening_hours バックフィル開始 ====="

while true; do
  round=$((round + 1))
  echo ""
  echo "[第${round}回] 実行中..."

  response=$(curl -s --max-time 90 "$URL")

  if echo "$response" | grep -q "FUNCTION_INVOCATION_TIMEOUT\|error"; then
    echo "  タイムアウトまたはエラー: $response"
    echo "  30秒待機して再試行..."
    sleep 30
    continue
  fi

  updated=$(echo "$response" | grep -o '"updated":[0-9]*' | grep -o '[0-9]*')
  skipped=$(echo "$response" | grep -o '"skipped":[0-9]*' | grep -o '[0-9]*')
  failed=$(echo "$response" | grep -o '"failed":[0-9]*' | grep -o '[0-9]*')

  updated=${updated:-0}
  skipped=${skipped:-0}
  failed=${failed:-0}

  total_updated=$((total_updated + updated))
  total_skipped=$((total_skipped + skipped))
  total_failed=$((total_failed + failed))

  echo "  更新: ${updated}件 / スキップ: ${skipped}件 / 失敗: ${failed}件"
  echo "  累計 → 更新: ${total_updated} / スキップ: ${total_skipped} / 失敗: ${total_failed}"

  # 更新もスキップもなければ終了（全件処理済み）
  if [ "$updated" -eq 0 ] && [ "$skipped" -eq 0 ] && [ "$failed" -eq 0 ]; then
    echo ""
    echo "===== 全件処理完了（補完対象なし）====="
    break
  fi

  # 次のバッチまで少し待機（API負荷軽減）
  sleep 5
done

echo ""
echo "===== 最終結果 ====="
echo "  更新: ${total_updated}件"
echo "  スキップ（情報なし）: ${total_skipped}件"
echo "  失敗: ${total_failed}件"
