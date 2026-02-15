import paramiko
import sys

hostname = "43.156.132.218"
username = "ubuntu"
password = "x-%#Knso%et%es^c"
port = 22

def check():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {username}@{hostname}...")
        client.connect(hostname, port=port, username=username, password=password)
        print("Connected! Running diagnostics...")

        project_dir = "~/Velora-Jobs-FE-BE" 

        commands = [
            f"cd {project_dir} && docker compose ps",
            f"cd {project_dir} && docker compose logs backend --tail 100",
        ]

        for cmd in commands:
            print(f"\n--- EXEC: {cmd} ---")
            stdin, stdout, stderr = client.exec_command(cmd)
            print(stdout.read().decode())
            err = stderr.read().decode()
            if err: print(f"[STDERR] {err}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    check()
