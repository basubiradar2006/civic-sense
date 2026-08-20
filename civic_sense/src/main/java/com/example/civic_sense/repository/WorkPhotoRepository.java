package com.example.civic_sense.repository;

import com.example.civic_sense.entity.WorkPhoto;
import com.example.civic_sense.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkPhotoRepository
        extends JpaRepository<WorkPhoto, Long> {

    List<WorkPhoto> findByComplaint(Complaint complaint);

    List<WorkPhoto> findByComplaintId(Long complaintId);
}