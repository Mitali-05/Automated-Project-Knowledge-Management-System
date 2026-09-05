import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class DbReset {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://pkm-db.cxa0822agcne.eu-north-1.rds.amazonaws.com:5432/postgres";
        String user = "pkm_user";
        String pass = "Purvank1804";
        
        try (Connection conn = DriverManager.getConnection(url, user, pass);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("Dropping public schema...");
            stmt.execute("DROP SCHEMA public CASCADE;");
            
            System.out.println("Recreating public schema...");
            stmt.execute("CREATE SCHEMA public;");
            
            System.out.println("Database reset successful.");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
