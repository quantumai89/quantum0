import requests
import json
import time

def check_status():
    url = "http://localhost:5000/api/wav2lip/status"
    print(f"Checking status at {url}...")
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print("Status Code: 200 OK")
            print(json.dumps(response.json(), indent=2))
            return True
        else:
            print(f"Status Code: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    # Wait for server to start
    for i in range(5):
        if check_status():
            break
        print("Waiting for server...")
        time.sleep(2)
