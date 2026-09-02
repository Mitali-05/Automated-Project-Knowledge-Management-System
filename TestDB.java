import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class TestDB {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://pkm-db.cxa0822agcne.eu-north-1.rds.amazonaws.com:5432/postgres";
        String user = "pkm_user";
        String password = "Purvank123";

        try {
            Connection conn = DriverManager.getConnection(url, user, password);
            System.out.println("SUCCESS: Connected to AWS RDS!");
            conn.close();
        } catch (SQLException e) {
            System.out.println("FAILED: " + e.getMessage());
        }
    }
}
