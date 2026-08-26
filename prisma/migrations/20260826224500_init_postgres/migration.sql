-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Package',
    "accent" TEXT NOT NULL DEFAULT 'indigo',
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT,
    "benefits" TEXT NOT NULL DEFAULT '[]',
    "painPoints" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "typicalPriceMin" INTEGER,
    "typicalPriceMax" INTEGER,
    "typicalDurationWeeksMin" INTEGER,
    "typicalDurationWeeksMax" INTEGER,
    "typicalPriceLocked" BOOLEAN NOT NULL DEFAULT false,
    "minViableFeatureCount" INTEGER NOT NULL DEFAULT 8,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureGroup" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'Layers',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeatureGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientDescription" TEXT NOT NULL,
    "internalDescription" TEXT,
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "manDayMin" DOUBLE PRECISION NOT NULL,
    "manDayMax" DOUBLE PRECISION NOT NULL,
    "effortRatioOverride" DOUBLE PRECISION,
    "isEssential" BOOLEAN NOT NULL DEFAULT false,
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "promotedFromRequestId" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureMedia" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'IMAGE',
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeatureMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureDependency" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "targetFeatureId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "FeatureDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preset" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bestFor" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',

    CONSTRAINT "Preset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresetFeature" (
    "id" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,

    CONSTRAINT "PresetFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WizardQuestion" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "helpText" TEXT,
    "inputType" TEXT NOT NULL DEFAULT 'SINGLE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WizardQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WizardOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'Circle',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "suggestPresetSlug" TEXT,

    CONSTRAINT "WizardOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WizardOptionFeature" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "WizardOptionFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT,
    "referenceRatePerManDay" INTEGER NOT NULL DEFAULT 3200000,
    "multiplierStandard" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
    "multiplierConfigurable" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "multiplierCustom" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "corePackagePrice" INTEGER NOT NULL DEFAULT 25000000,
    "effortRatioCore" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "effortRatioStandard" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "effortRatioConfigurable" DOUBLE PRECISION NOT NULL DEFAULT 0.80,
    "effortRatioCustom" DOUBLE PRECISION NOT NULL DEFAULT 1.10,
    "corePackageManDay" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "setupEffortManDay" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "overheadEffortRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
    "avgDeveloperSalary" INTEGER NOT NULL DEFAULT 12000000,
    "burdenFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.35,
    "effectiveWorkDaysPerMonth" DOUBLE PRECISION NOT NULL DEFAULT 19.4,
    "billableUtilization" DOUBLE PRECISION NOT NULL DEFAULT 0.65,
    "supportRoleRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.45,
    "cogsPerManDayOverride" INTEGER,
    "platformMultipliers" TEXT NOT NULL DEFAULT '{}',
    "deploymentMultipliers" TEXT NOT NULL DEFAULT '{}',
    "userTierPricing" TEXT NOT NULL DEFAULT '[]',
    "setupFee" INTEGER NOT NULL DEFAULT 10000000,
    "volumeDiscountTiers" TEXT NOT NULL DEFAULT '[]',
    "discountCountsCoreFeatures" BOOLEAN NOT NULL DEFAULT false,
    "minProjectValue" INTEGER NOT NULL DEFAULT 35000000,
    "maxCustomSharePct" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "salesOverrideQuotaPct" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "minGrossMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "targetGrossMarginMin" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "targetGrossMarginMax" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
    "customManDayConsultThreshold" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "rangeWidthCore" DOUBLE PRECISION NOT NULL DEFAULT 1.15,
    "rangeWidthStandard" DOUBLE PRECISION NOT NULL DEFAULT 1.30,
    "rangeWidthConfigurable" DOUBLE PRECISION NOT NULL DEFAULT 1.80,
    "rangeWidthCustom" DOUBLE PRECISION NOT NULL DEFAULT 2.00,
    "parallelDevelopers" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "workDaysPerWeek" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "fixedDurationWeeks" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "durationBufferFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
    "quoteValidityDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Puzzle',
    "logoUrl" TEXT,
    "priceMin" INTEGER NOT NULL,
    "priceMax" INTEGER NOT NULL,
    "manDayMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manDayMax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "optionGroup" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOnCategory" (
    "id" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "AddOnCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "presetId" TEXT,
    "ownerId" TEXT,
    "pricingRuleId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Rakitan Saya',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "source" TEXT NOT NULL DEFAULT 'DIRECT',
    "wizardAnswers" TEXT NOT NULL DEFAULT '{}',
    "platform" TEXT NOT NULL DEFAULT 'WEB',
    "deployment" TEXT NOT NULL DEFAULT 'OUR_CLOUD',
    "userTier" TEXT NOT NULL DEFAULT 'T10',
    "projectOptionsCompleted" BOOLEAN NOT NULL DEFAULT false,
    "subtotalMin" INTEGER NOT NULL DEFAULT 0,
    "subtotalMax" INTEGER NOT NULL DEFAULT 0,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountMin" INTEGER NOT NULL DEFAULT 0,
    "discountMax" INTEGER NOT NULL DEFAULT 0,
    "addOnMin" INTEGER NOT NULL DEFAULT 0,
    "addOnMax" INTEGER NOT NULL DEFAULT 0,
    "setupFee" INTEGER NOT NULL DEFAULT 0,
    "totalMin" INTEGER NOT NULL DEFAULT 0,
    "totalMax" INTEGER NOT NULL DEFAULT 0,
    "recurringMonthlyMin" INTEGER NOT NULL DEFAULT 0,
    "recurringMonthlyMax" INTEGER NOT NULL DEFAULT 0,
    "durationWeeksMin" INTEGER NOT NULL DEFAULT 0,
    "durationWeeksMax" INTEGER NOT NULL DEFAULT 0,
    "cogsProjection" INTEGER NOT NULL DEFAULT 0,
    "grossMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "realEffortManDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customSharePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "belowMinProjectValue" BOOLEAN NOT NULL DEFAULT false,
    "exceedsCustomShare" BOOLEAN NOT NULL DEFAULT false,
    "belowMinViable" BOOLEAN NOT NULL DEFAULT false,
    "belowMinMargin" BOOLEAN NOT NULL DEFAULT false,
    "guardrailNotes" TEXT NOT NULL DEFAULT '[]',
    "isPriceLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedPrice" INTEGER,
    "lockedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lockedById" TEXT,
    "trafficSource" TEXT,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurationItem" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'USER',
    "reason" TEXT,
    "triggeredByFeatureId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "typeSnapshot" TEXT NOT NULL,
    "manDayMin" DOUBLE PRECISION NOT NULL,
    "manDayMax" DOUBLE PRECISION NOT NULL,
    "unitPriceMin" INTEGER NOT NULL,
    "unitPriceMax" INTEGER NOT NULL,
    "effortManDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigurationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurationAddOn" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "kindSnapshot" TEXT NOT NULL,
    "priceMin" INTEGER NOT NULL,
    "priceMax" INTEGER NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "manDayMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manDayMax" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ConfigurationAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFeatureRequest" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "groupId" TEXT,
    "name" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "userRoles" TEXT NOT NULL,
    "flowSteps" TEXT NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'MUST_HAVE',
    "attachments" TEXT NOT NULL DEFAULT '[]',
    "referenceLinks" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "manDayMin" DOUBLE PRECISION,
    "manDayMax" DOUBLE PRECISION,
    "unitPriceMin" INTEGER,
    "unitPriceMax" INTEGER,
    "riskLevel" TEXT,
    "internalNote" TEXT,
    "clarificationQuestion" TEXT,
    "clarificationAnswer" TEXT,
    "rejectReason" TEXT,
    "reviewerId" TEXT,
    "slaDueAt" TIMESTAMP(3) NOT NULL,
    "estimatedAt" TIMESTAMP(3),
    "promotedFeatureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFeatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "pricingRuleId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'SUBMIT',
    "payload" TEXT NOT NULL,
    "totalMin" INTEGER NOT NULL,
    "totalMax" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurationRevision" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '{}',
    "totalMin" INTEGER NOT NULL DEFAULT 0,
    "totalMax" INTEGER NOT NULL DEFAULT 0,
    "actorLabel" TEXT NOT NULL DEFAULT 'Klien',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigurationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "budgetBand" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "note" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "ownerId" TEXT,
    "lostReason" TEXT,
    "lostNote" TEXT,
    "needsDeepDiscovery" BOOLEAN NOT NULL DEFAULT false,
    "overridePricePct" DOUBLE PRECISION,
    "overridePriceValue" INTEGER,
    "overrideReason" TEXT,
    "overrideApprovedById" TEXT,
    "overrideApprovedAt" TIMESTAMP(3),
    "overrideStatus" TEXT NOT NULL DEFAULT 'NONE',
    "validUntil" TIMESTAMP(3) NOT NULL,
    "discoveryCallAt" TIMESTAMP(3),
    "trafficSource" TEXT,
    "utm" TEXT NOT NULL DEFAULT '{}',
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'NOTE',
    "body" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "body" TEXT NOT NULL DEFAULT '{}',
    "totalValue" INTEGER NOT NULL DEFAULT 0,
    "signedAt" TIMESTAMP(3),
    "signerName" TEXT,
    "signerEmail" TEXT,
    "signatureMeta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "leadId" TEXT,
    "clientId" TEXT,
    "managerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "targetEndDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "progressPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stagingUrl" TEXT,
    "demoUrl" TEXT,
    "contractValue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "featureId" TEXT,
    "customRequestId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "phase" TEXT NOT NULL DEFAULT 'Fase 1',
    "assigneeId" TEXT,
    "estimateManDayMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimateManDayMax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualManDay" DOUBLE PRECISION,
    "targetDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "clientNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "clientNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'MILESTONE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" INTEGER NOT NULL,
    "taxPct" DOUBLE PRECISION NOT NULL DEFAULT 11,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'MANUAL_TRANSFER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "proofUrl" TEXT,
    "gatewayPayload" TEXT NOT NULL DEFAULT '{}',
    "paidAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionMessage" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT,
    "authorLabel" TEXT NOT NULL DEFAULT 'Klien',
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'OTHER',
    "url" TEXT NOT NULL,
    "sizeLabel" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "addendumConfigurationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "priceMin" INTEGER NOT NULL DEFAULT 0,
    "priceMax" INTEGER NOT NULL DEFAULT 0,
    "approvedPrice" INTEGER,
    "timelineImpactWeeks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newTargetEndDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "configurationId" TEXT,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "path" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actorLabel" TEXT NOT NULL DEFAULT 'system',
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "before" TEXT NOT NULL DEFAULT '{}',
    "after" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'UNSURE',
    "message" TEXT NOT NULL,
    "configurationToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationSnapshot" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "refManDayAvg" DOUBLE PRECISION NOT NULL,
    "actualManDayAvg" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "deviationPct" DOUBLE PRECISION NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalibrationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationCategory_slug_key" ON "ApplicationCategory"("slug");

-- CreateIndex
CREATE INDEX "ApplicationCategory_status_sortOrder_idx" ON "ApplicationCategory"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "FeatureGroup_categoryId_sortOrder_idx" ON "FeatureGroup"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureGroup_categoryId_slug_key" ON "FeatureGroup"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "Feature_categoryId_groupId_sortOrder_idx" ON "Feature"("categoryId", "groupId", "sortOrder");

-- CreateIndex
CREATE INDEX "Feature_status_idx" ON "Feature"("status");

-- CreateIndex
CREATE INDEX "Feature_type_idx" ON "Feature"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_categoryId_slug_key" ON "Feature"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "FeatureMedia_featureId_sortOrder_idx" ON "FeatureMedia"("featureId", "sortOrder");

-- CreateIndex
CREATE INDEX "FeatureDependency_featureId_idx" ON "FeatureDependency"("featureId");

-- CreateIndex
CREATE INDEX "FeatureDependency_targetFeatureId_idx" ON "FeatureDependency"("targetFeatureId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureDependency_featureId_targetFeatureId_kind_key" ON "FeatureDependency"("featureId", "targetFeatureId", "kind");

-- CreateIndex
CREATE INDEX "Preset_categoryId_sortOrder_idx" ON "Preset"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Preset_categoryId_slug_key" ON "Preset"("categoryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PresetFeature_presetId_featureId_key" ON "PresetFeature"("presetId", "featureId");

-- CreateIndex
CREATE INDEX "WizardQuestion_categoryId_sortOrder_idx" ON "WizardQuestion"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WizardQuestion_categoryId_slug_key" ON "WizardQuestion"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "WizardOption_questionId_sortOrder_idx" ON "WizardOption"("questionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WizardOption_questionId_slug_key" ON "WizardOption"("questionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "WizardOptionFeature_optionId_featureId_key" ON "WizardOptionFeature"("optionId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_version_key" ON "PricingRule"("version");

-- CreateIndex
CREATE INDEX "PricingRule_isActive_idx" ON "PricingRule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AddOn_slug_key" ON "AddOn"("slug");

-- CreateIndex
CREATE INDEX "AddOn_kind_sortOrder_idx" ON "AddOn"("kind", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AddOnCategory_addOnId_categoryId_key" ON "AddOnCategory"("addOnId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_publicToken_key" ON "Configuration"("publicToken");

-- CreateIndex
CREATE INDEX "Configuration_status_idx" ON "Configuration"("status");

-- CreateIndex
CREATE INDEX "Configuration_categoryId_idx" ON "Configuration"("categoryId");

-- CreateIndex
CREATE INDEX "Configuration_ownerId_idx" ON "Configuration"("ownerId");

-- CreateIndex
CREATE INDEX "Configuration_createdAt_idx" ON "Configuration"("createdAt");

-- CreateIndex
CREATE INDEX "ConfigurationItem_configurationId_idx" ON "ConfigurationItem"("configurationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationItem_configurationId_featureId_key" ON "ConfigurationItem"("configurationId", "featureId");

-- CreateIndex
CREATE INDEX "ConfigurationAddOn_configurationId_idx" ON "ConfigurationAddOn"("configurationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationAddOn_configurationId_addOnId_key" ON "ConfigurationAddOn"("configurationId", "addOnId");

-- CreateIndex
CREATE INDEX "CustomFeatureRequest_status_slaDueAt_idx" ON "CustomFeatureRequest"("status", "slaDueAt");

-- CreateIndex
CREATE INDEX "CustomFeatureRequest_configurationId_idx" ON "CustomFeatureRequest"("configurationId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_configurationId_createdAt_idx" ON "PriceSnapshot"("configurationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConfigurationRevision_configurationId_createdAt_idx" ON "ConfigurationRevision"("configurationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationRevision_configurationId_version_key" ON "ConfigurationRevision"("configurationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_quoteNumber_key" ON "Lead"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_configurationId_key" ON "Lead"("configurationId");

-- CreateIndex
CREATE INDEX "Lead_stage_updatedAt_idx" ON "Lead"("stage", "updatedAt");

-- CreateIndex
CREATE INDEX "Lead_ownerId_idx" ON "Lead"("ownerId");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadActivity_dueAt_idx" ON "LeadActivity"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_number_key" ON "Contract"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_leadId_key" ON "Contract"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Project_configurationId_key" ON "Project"("configurationId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_leadId_key" ON "Project"("leadId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "ProjectTask_projectId_status_idx" ON "ProjectTask"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectTask_assigneeId_idx" ON "ProjectTask"("assigneeId");

-- CreateIndex
CREATE INDEX "Milestone_projectId_sortOrder_idx" ON "Milestone"("projectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_projectId_status_idx" ON "Invoice"("projectId", "status");

-- CreateIndex
CREATE INDEX "Invoice_dueAt_idx" ON "Invoice"("dueAt");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "DiscussionMessage_taskId_createdAt_idx" ON "DiscussionMessage"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_number_key" ON "ChangeRequest"("number");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_addendumConfigurationId_key" ON "ChangeRequest"("addendumConfigurationId");

-- CreateIndex
CREATE INDEX "ChangeRequest_projectId_status_idx" ON "ChangeRequest"("projectId", "status");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_configurationId_idx" ON "AnalyticsEvent"("configurationId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ConsultationRequest_status_createdAt_idx" ON "ConsultationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CalibrationSnapshot_featureId_idx" ON "CalibrationSnapshot"("featureId");

-- CreateIndex
CREATE INDEX "CalibrationSnapshot_periodLabel_idx" ON "CalibrationSnapshot"("periodLabel");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureGroup" ADD CONSTRAINT "FeatureGroup_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ApplicationCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ApplicationCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FeatureGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureMedia" ADD CONSTRAINT "FeatureMedia_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureDependency" ADD CONSTRAINT "FeatureDependency_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureDependency" ADD CONSTRAINT "FeatureDependency_targetFeatureId_fkey" FOREIGN KEY ("targetFeatureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preset" ADD CONSTRAINT "Preset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ApplicationCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresetFeature" ADD CONSTRAINT "PresetFeature_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "Preset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresetFeature" ADD CONSTRAINT "PresetFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WizardQuestion" ADD CONSTRAINT "WizardQuestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ApplicationCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WizardOption" ADD CONSTRAINT "WizardOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "WizardQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WizardOptionFeature" ADD CONSTRAINT "WizardOptionFeature_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "WizardOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WizardOptionFeature" ADD CONSTRAINT "WizardOptionFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOnCategory" ADD CONSTRAINT "AddOnCategory_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOnCategory" ADD CONSTRAINT "AddOnCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ApplicationCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ApplicationCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "Preset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationItem" ADD CONSTRAINT "ConfigurationItem_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationItem" ADD CONSTRAINT "ConfigurationItem_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationAddOn" ADD CONSTRAINT "ConfigurationAddOn_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationAddOn" ADD CONSTRAINT "ConfigurationAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFeatureRequest" ADD CONSTRAINT "CustomFeatureRequest_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFeatureRequest" ADD CONSTRAINT "CustomFeatureRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationRevision" ADD CONSTRAINT "ConfigurationRevision_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_customRequestId_fkey" FOREIGN KEY ("customRequestId") REFERENCES "CustomFeatureRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_addendumConfigurationId_fkey" FOREIGN KEY ("addendumConfigurationId") REFERENCES "Configuration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
