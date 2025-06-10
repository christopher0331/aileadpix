import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    // Read the screenshot decisions
    const decisionsPath = path.join(process.cwd(), 'public', 'screenshot-decisions.json');
    if (!fs.existsSync(decisionsPath)) {
      return NextResponse.json(
        { error: 'No screenshot decisions found' },
        { status: 404 }
      );
    }
    
    const decisionsData = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));
    const decisions = decisionsData.decisions || {};
    
    // Get the contacts data from the request
    const body = await request.json();
    const { contacts } = body;
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of contacts' },
        { status: 400 }
      );
    }
    
    // Split the contacts based on screenshot decisions
    const approvedContacts = [];
    const rejectedContacts = [];
    const pendingContacts = [];
    
    contacts.forEach(contact => {
      if (!contact.website) {
        pendingContacts.push(contact);
        return;
      }
      
      // Extract domain from website URL
      let domain = contact.website;
      try {
        // Remove protocol if present
        domain = domain.replace(/^https?:\/\//, '');
        // Remove www. if present
        domain = domain.replace(/^www\./, '');
        // Remove path and query params if present
        domain = domain.split('/')[0];
      } catch (error) {
        console.error('Error processing domain:', error);
      }
      
      // Check if the domain has a decision
      if (decisions[domain] === true) {
        approvedContacts.push({
          ...contact,
          domain,
          reviewDecision: 'approved'
        });
      } else if (decisions[domain] === false) {
        rejectedContacts.push({
          ...contact,
          domain,
          reviewDecision: 'rejected'
        });
      } else {
        pendingContacts.push({
          ...contact,
          domain,
          reviewDecision: 'pending'
        });
      }
    });
    
    // Save to local storage for the client to retrieve
    const approvedPath = path.join(process.cwd(), 'public', 'approved-contacts.json');
    const rejectedPath = path.join(process.cwd(), 'public', 'rejected-contacts.json');
    const pendingPath = path.join(process.cwd(), 'public', 'pending-contacts.json');
    
    fs.writeFileSync(approvedPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      contacts: approvedContacts
    }));
    
    fs.writeFileSync(rejectedPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      contacts: rejectedContacts
    }));
    
    fs.writeFileSync(pendingPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      contacts: pendingContacts
    }));
    
    return NextResponse.json({
      success: true,
      counts: {
        approved: approvedContacts.length,
        rejected: rejectedContacts.length,
        pending: pendingContacts.length,
        total: contacts.length
      },
      files: {
        approved: '/approved-contacts.json',
        rejected: '/rejected-contacts.json',
        pending: '/pending-contacts.json'
      }
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process contacts' },
      { status: 500 }
    );
  }
}
