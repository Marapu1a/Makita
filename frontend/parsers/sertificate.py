import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

def download_images(url, folder="images"):
    os.makedirs(folder, exist_ok=True)
    
    response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
    if response.status_code != 200:
        print(f"Ошибка при получении страницы: {response.status_code}")
        return
    
    soup = BeautifulSoup(response.text, "html.parser")
    links = soup.find_all("a", class_="highslide")
    
    for link in links:
        img_url = link.get("href")
        if not img_url:
            continue
        
        img_url = urljoin(url, img_url)
        img_name = os.path.join(folder, os.path.basename(img_url).split("?")[0])
        
        try:
            img_data = requests.get(img_url).content
            with open(img_name, "wb") as f:
                f.write(img_data)
            print(f"Скачано: {img_name}")
        except Exception as e:
            print(f"Ошибка при скачивании {img_url}: {e}")

if __name__ == "__main__":
    url = input("Введите URL страницы: ")
    download_images(url)
