import paramiko

HOST = "43.156.132.218"
USER = "ubuntu"
PASS = "x-%#Knso%et%es^c"

def list_fe():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {USER}@{HOST}...")
        client.connect(HOST, username=USER, password=PASS)
        
        print("\n--- Frontend File List ---")
        cmd = "ls -p /home/ubuntu/Velora-Jobs-FE-BE/frontend/"
        stdin, stdout, stderr = client.exec_command(cmd)
        print(stdout.read().decode())
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    list_fe()
