import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;

public class TestGithubApi {
    public static void main(String[] args) {
        try {
            String readmeUrl = "https://api.github.com/repos/facebook/react/readme";
            URL url = new URL(readmeUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Accept", "application/vnd.github+json");
            connection.setRequestProperty("X-GitHub-Api-Version", "2022-11-28");
            
            System.out.println("Response Code: " + connection.getResponseCode());
            
            InputStream is = connection.getResponseCode() >= 400 ? connection.getErrorStream() : connection.getInputStream();
            Scanner s = new Scanner(is).useDelimiter("\\A");
            System.out.println("Response: " + (s.hasNext() ? s.next() : ""));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
