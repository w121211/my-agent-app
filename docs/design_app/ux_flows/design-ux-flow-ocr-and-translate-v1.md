# UX 流程設計 - 對書頁掃描檔做OCR＆翻譯

## 1. 純手動、利用編輯器

假設使用者有一些自己習慣的AI流程，希望照自己的流程來
這個流程是在展現編輯器的高度彈性
整個流程都是在同一個 task 裡，使用者透過開新 chat 來完成每個子工作
OCR + 翻譯都是在同一個 task 下，使用者只有新增 chat，而沒有新增 task

### OCR部分 ，包含創新 task

使用者在主頁開新chat，chat modal 彈出
在主頁開新 chat 的話，chat modal 預設是chat mode、勾選創新task，使用者沿用不做修改
-> 使用者拖曳 p1.jpg, p2.jpg, .... 至modal
-> 系統增加檔案 ＆顯示在 prompt input「#p1.jpg #p2.jpg #...」
-> 使用者調整 prompt：「#p1.jpg #p2.jpg #... 請對 #p1.jpg 做 OCR 辨識，把所有文字都抓出來，排版請盡量照原來的書本格式」 ＆ 送出
-> AI 回應 p1 的 ocr 結果（包在 code block 或是 <artifact> 標籤內）
-> 若是 artifact，系統自動辨識＆存成檔案，例如 p1_ocr.md
若是 code block，使用者點擊UI便捷功能，將code block存為檔案

使用者開新chat，「請對 #p2.jpg 做 OCR 辨識，把所有文字都抓出來，排版請盡量照原來的書本格式。」
-> 跑跟上面一樣的流程（可以略過）
-> 對p3做同樣的事
-> 現在 task folder 中有了 chat1, cha2, chat, p1_ocd.md, p2_ocr.md,...
-> OCR部分結束

### 翻譯部分

（仍然是在同一個 task 裡）

使用者開新chat，「請翻譯 #p1_ocd.md」
-> AI輸出翻譯結果
在沒有給予詳細的指示下，AI很難一次就輸出使用者想要的結果，這是完全正常的
-> 使用者基於AI的輸出結果，在 task folder 新增 #翻譯注意事項.txt #輸出範例.txt 檔案
-> 使用者修改prompt，導入指引檔案：「請翻譯 #p1_ocd.md #翻譯注意事項.txt #輸出範例.txt」
（後台）一旦編輯 prompt 並送出後，代表是原本的 chat 被修改，需要分支，系統會自動建立一個新chat並給予最新version，例如 chat1.v1.json, chat1.v2.json，然後載入新chat，這樣原本的chat就能保留下來
-> AI輸出翻譯結果
-> （使用者根據輸出結果持續調整指引、範例，直到確保輸出符合預期）
-> （繼續做 p2, p3 翻譯）使用者開新chat，「請翻譯 #p2_ocd.md #翻譯注意事項.txt #輸出範例.txt」
-> AI輸出翻譯結果、使用者存成相關檔案
-> 翻譯部分結束

## 2. 使用Agent模式，純自動

這個流程是在展現 agent 模式的進行，原則上，就是 agent -> agent -> agent -> … 直到agent自己認定工作、或是子工作完成，然後請使用者檢視
我們先假設這是個積極型的 agent，不會問使用者意見，會一次完成

使用者在主頁開新chat，chat modal 彈出
-> 使用者拖曳 p1.jpg, p2.jpg, .... 至modal
-> 系統增加檔案 ＆顯示在 prompt input「#p1.jpg #p2.jpg #...」
-> 使用者改成用 agent mode，一樣是創新 task
-> 使用者寫 prompt：「#p1.jpg #p2.jpg #... 請對書頁掃描檔做OCR＆翻譯」 ＆ 送出
-> 系統創新 task folder（包含p1, p2, ...掃描檔）、chat file，開啟 chat（ agent），然後執行

### Agent mode 開始

（全部在同一個 chat，透過 ai 自循環、function call等步驟完成）

系統：task 開始執行
-> AI 分析使用者的意圖、訂出工作計畫
-> AI:對 #p1 做ocr <工作規劃>計畫：... 目前進度...： 下一步：...</工作規劃>
-> AI:將結果存成 p1_ocr.md <工作規劃>...</工作規劃>
（function call）
（每步驟AI都需要自我檢視 <工作規劃>，這裡就省略不寫了）
-> 系統：function call result: file `p1_ocr.md` created
-> AI:對 #p2 做ocr  
-> AI:將結果存成 p2_ocr.md（function call）
-> 系統：function call result: file `p2_ocr.md` created
…
-> AI:對 #p1_ocr.md 做翻譯
-> AI:將結果存成 p1_ocr_translate.txt （function call）
-> 系統：function call result: file `p1_ocr_translate.txt` created
-> AI:對 #p2_ocr.md 做翻譯
-> AI:將結果存成 p2_ocr_translate.txt （function call）
-> 系統：function call result: file `p2_ocr_translate.txt` created
-> …
-> AI:將 #p1_ocr_translate.txt #… 彙整成一個 #book_ocr_trasnlate.txt並輸出
-> AI:判斷工作已完成，工作成果 #book_ocr_trasnlate.txt。結束 agent loop
-> 系統：task 結束執行

## 3. 使用「下一步」

以 1. 純手動的流程做舉例，「下一步」就是在完成一個工作、子工作時，自動讓 ai 建議下一個工作
這裡展示的下一步，接近（或根本等同於）由 AI 來幫我想下一個 chat prompt 要給什麼
就是在這個工作已經結束後，我懶得指示下一個工作，所以請 AI 來幫忙寫

（1. 純手動的流程，不變）
使用者在主頁開新chat，chat modal 彈出
在主頁開新 chat 的話，chat modal 預設是chat mode、勾選創新task，使用者沿用不做修改
-> 使用者拖曳 p1.jpg, p2.jpg, .... 至modal
-> 系統增加檔案 ＆顯示在 prompt input「#p1.jpg #p2.jpg #...」
-> 使用者調整 prompt：「#p1.jpg #p2.jpg #... 請對 #p1.jpg 做 OCR 辨識，把所有文字都抓出來，排版請盡量照原來的書本格式」 ＆ 送出
-> AI 回應 p1 的 ocr 結果（包在 code block 或是 <artifact> 標籤內）
-> 若是 artifact，系統自動辨識＆存成檔案，例如 p1_ocr.md
若是 code block，使用者點擊UI便捷功能，將code block存為檔案

（使用「下一步」）
-> 使用者：在 chat 上點擊「下一步」
-> 後台：AI分析當前 task 、chat，給予下一步建議
-> 系統：彈出下一步 modal，包含 AI 的下一步建議
「開新chat，給予prompt: 請對 #p2.jpg 做 OCR 辨識，把所有文字都抓出來，排版請盡量照原來的書本格式」
-> 使用者：確認後送出（也可以修改編輯，或乾脆就無腦送出）
-> 系統：將 AI的下一步建議轉譯成 function call
-> 系統：執行 function：開新 chat，prompt 「請對 #p2.jpg 做 OCR 辨識，把所有文字都抓出來，排版請盡量照原來的書本格式」，run chat
-> chat column 載入新的chat，這個chat已經有此內容
`
	User:  「請對 #p2.jpg 做 OCR 辨識，把所有文字都抓出來，排版請盡量照原來的書本格式」  
	` （正在等 AI 回應）
-> AI輸出結果
-> 使用者按「下一步」，繼續以上循環
