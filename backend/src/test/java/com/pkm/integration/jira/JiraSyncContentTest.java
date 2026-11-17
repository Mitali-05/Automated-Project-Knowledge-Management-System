package com.pkm.integration.jira;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class JiraSyncContentTest {
    @Test void adfParagraphsAndMentionsKeepReadableBoundaries() throws Exception {
        var node=new ObjectMapper().readTree("{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Requirement\"}]},{\"type\":\"paragraph\",\"content\":[{\"type\":\"mention\",\"attrs\":{\"text\":\"@Reviewer\"}},{\"type\":\"text\",\"text\":\" agrees\"}]}]}");
        assertEquals("Requirement\n@Reviewer agrees\n",JiraSyncService.text(node));
    }
    @Test void nullCriteriaAreEmptyRatherThanInvented() throws Exception {
        assertEquals("",JiraSyncService.text(new ObjectMapper().readTree("null")));
    }
}
