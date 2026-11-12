package com.pkm.knowledge;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "knowledge_evidence")
@Getter
@Setter
@NoArgsConstructor
public class KnowledgeEvidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "knowledge_item_id", nullable = false)
    private KnowledgeItem item;

    @Column(name = "source_type", nullable = false, length = 30)
    private String sourceType;

    @Column(name = "source_ref", nullable = false, length = 512)
    private String sourceRef;

    @Column(length = 1024)
    private String url;

    @Column(columnDefinition = "TEXT")
    private String excerpt;
}
