package com.pkm.report;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/** A generated download (PDF report or PPTX deck) of one repository. */
@Entity
@Table(name = "repository_report_files")
@Getter
@Setter
@NoArgsConstructor
public class RepositoryReportFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "repository_id", nullable = false)
    private Long repositoryId;

    /** "pdf" or "pptx". */
    @Column(nullable = false, length = 10)
    private String kind;

    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(nullable = false)
    private byte[] content;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
