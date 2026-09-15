import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

html_path = r'D:\SANTFRIX\secondear_live_demo.html'
if os.path.exists(html_path):
    with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()
    print("HTML File Size:", len(html))
    headings = re.findall(r'<h[1-4][^>]*>(.*?)</h[1-4]>', html, re.DOTALL)
    print("\n--- Headings in secondear_live_demo.html ---")
    for h in headings[:25]:
        clean_h = re.sub(r'<[^>]+>', '', h).strip()
        if clean_h:
            print(f"- {clean_h}")
            
    print("\n--- Script / Function signatures in HTML ---")
    functions = re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', html)
    print("Functions:", functions)
