import paramiko

HOST = "43.156.132.218"
USER = "ubuntu"
PASS = "x-%#Knso%et%es^c"

def check_fe_dockerfile():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {USER}@{HOST}...")
        client.connect(HOST, username=USER, password=PASS)
        
        print("\n--- Frontend Dockerfile ---")
        cmd = "cat /home/ubuntu/Velora-Jobs-FE-BE/frontend/Dockerfile"
        stdin, stdout, stderr = client.exec_command(cmd)
        print(stdout.read().decode())
        
        print("\n--- Frontend Package.json ---")
        cmd = "cat /home/ubuntu/Velora-Jobs-FE-BE/frontend/package.json"
        stdin, stdout, stderr = client.exec_command(cmd)
        print(stdout.read().decode())

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    check_fe_dockerfile()
