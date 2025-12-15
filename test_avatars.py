import requests
import json
import time

def check_avatars():
    url = "http://localhost:5000/api/avatars"
    print(f"Checking avatars at {url}...")
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print("Status Code: 200 OK")
            print(json.dumps(response.json(), indent=2))
            return True
        else:
            print(f"Status Code: {response.status_code}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    for i in range(5):
        if check_avatars():
            break
        print("Waiting for server...")
        time.sleep(2)
