<?php

namespace App\Http\Controllers;

use App\Models\MasterSection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class SectionController extends Controller
{
    /**
     * Display a listing of master sections.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        if (!$user->hasPermissionTo('view-document')) {
            return redirect('/shipping')->with('error', 'Anda tidak memiliki akses ke halaman tersebut.');
        }

        $sections = MasterSection::on('tako-user')
            ->orderBy('section_order', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'id_section' => $item->id_section,
                    'section_name' => $item->section_name,
                    'section_order' => $item->section_order,
                    'is_penjaluran' => (bool) $item->is_penjaluran,
                    'attribute_section' => is_null($item->attribute_section)
                        ? null
                        : ($item->attribute_section ? 'mandatory' : 'non_mandatory'),
                    'source' => 'master',
                ];
            });

        return Inertia::render('m_section/page', [
            'sections' => $sections,
            'trans_sec' => trans('section'),
        ]);
    }

    /**
     * Store a newly created master section.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'section_name' => 'required|string|max:255',
            'is_penjaluran' => 'nullable|boolean',
            'attribute_section' => 'nullable|string|in:mandatory,non_mandatory',
        ]);

        $validated['is_penjaluran'] = $request->boolean('is_penjaluran', false);

        $lastId = MasterSection::on('tako-user')->max('id_section');
        $nextId = ($lastId ?? 0) + 1;

        $lastOrder = MasterSection::on('tako-user')->max('section_order');
        $nextOrder = ($lastOrder ?? 0) + 1;

        $validated['id_section'] = $nextId;
        $validated['section_order'] = $nextOrder;

        if ($request->filled('attribute_section')) {
            $validated['attribute_section'] = $request->attribute_section === 'mandatory';
        } else {
            $validated['attribute_section'] = null;
        }

        MasterSection::on('tako-user')->create($validated);

        return redirect()->back()->with('success', 'Section berhasil ditambahkan.');
    }

    /**
     * Update the specified master section.
     */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'section_name' => 'required|string|max:255',
            'section_order' => 'required|integer|min:1',
            'is_penjaluran' => 'nullable|boolean',
            'attribute_section' => 'nullable|string|in:mandatory,non_mandatory',
        ]);

        $validated['is_penjaluran'] = $request->boolean('is_penjaluran', false);

        if ($request->filled('attribute_section')) {
            $validated['attribute_section'] = $request->attribute_section === 'mandatory';
        } else {
            $validated['attribute_section'] = null;
        }

        $section = MasterSection::on('tako-user')->findOrFail($id);
        $section->update($validated);

        return redirect()->back()->with('success', 'Section berhasil diperbarui.');
    }

    /**
     * Remove the specified master section.
     */
    public function destroy($id)
    {
        $user = Auth::user();

        $section = MasterSection::on('tako-user')->findOrFail($id);
        $section->delete();

        return redirect()->back()->with('success', 'Section berhasil dihapus.');
    }
}