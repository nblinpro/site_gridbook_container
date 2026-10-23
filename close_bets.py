import mysql.connector
from datetime import datetime, timedelta

# Configuration BDD
db_config = {
    'host': '192.168.0.2', # L'IP de ta VM DB Prod ou Dev
    'user': 'user_db',
    'password': '9EWjaxJt@YsH&yp0',
    'database': 'GridBookDB'
}

def close_upcoming_races():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # Seuil : maintenant + 10 minutes
        threshold = datetime.now() + timedelta(minutes=10)

        # On ferme les paris si le start_datetime est inférieur au seuil
        query = """
            UPDATE races 
            SET is_open = 0 
            WHERE is_open = 1 
            AND start_datetime <= %s
        """
        
        cursor.execute(query, (threshold,))
        conn.commit()

        if cursor.rowcount > 0:
            print(f"[{datetime.now()}] {cursor.rowcount} course(s) fermée(s) pour les paris.")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Erreur : {e}")

if __name__ == "__main__":
    close_upcoming_races()
