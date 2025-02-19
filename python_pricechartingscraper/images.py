import os
import requests

def download_image(id, url):
    directory = f"./products/{id[:3]}"
    if not os.path.exists(directory):
        os.makedirs(directory)
    
    # Download the image
    response = requests.get(url)
    if response.status_code == 200:
        # Save the image as a .webp file
        with open(f"{directory}/{id}.webp", "wb") as file:
            file.write(response.content)
        print(f"Downloaded and saved {url} as {directory}/{id}.webp")
    else:
        print(f"Failed to download {url}. Status code: {response.status_code}")

def parse_and_download_images(file_path):
    with open(file_path, 'r') as file:
        for line in file:
            # Split the line into id and url
            id, url = line.strip().split(';')
            download_image(id, url)

# Path to your images.txt file
file_path = 'images.txt'
parse_and_download_images(file_path)